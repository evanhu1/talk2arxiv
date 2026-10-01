// Standalone spike. Node 24 runs this TypeScript directly; no app or API key needed.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

type Json = any // Preserve provider payloads verbatim in this exploratory script.
type Ref = { arxiv?: string; doi?: string; title?: string }
type Case = { name: string; aliases?: string[]; reason: string; negative?: boolean; bibliography?: string; seed: Ref; checks: Ref[]; precisionChecks?: { provider: string; id: string; sourceUrl: string; note: string }[] }
type Work = { id: string; title: string; abstract: string | null; abstractError?: string; url: string | null; year: number | null; doi: string | null; arxiv: string | null; authors: { id: string; name: string; aliases?: string[] }[] }
type Result = { provider: string; author?: Json; resolution?: Json; works: Work[]; pages: number; total?: number; complete: boolean; error?: string }

export function normalize(value: string) {
  return value.normalize('NFKD').replace(/[Łł]/g, 'l').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

export function abstractText(index: Record<string, number[]> | null | undefined) {
  if (!index) return null
  const words: string[] = []
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      if (!Number.isSafeInteger(position) || position < 0 || position > 100_000) throw new Error('Invalid abstract position')
      if (words[position] !== undefined) throw new Error('Overlapping abstract positions')
      words[position] = word
    }
  }
  if (Array.from(words).some((word) => word === undefined)) throw new Error('Incomplete abstract positions')
  return words.join(' ').trim() || null
}

function decodeXml(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(/^#x/i.test(entity) ? 2 : 1), /^#x/i.test(entity) ? 16 : 10))
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[entity]
  })
}
function tag(xml: string, name: string) {
  return decodeXml(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? '').replace(/\s+/g, ' ').trim()
}
export function parseArxiv(xml: string) {
  if (!xml.includes('<feed')) throw new Error('Expected an arXiv Atom feed')
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]): Work => {
    const id = tag(entry, 'id').replace(/^https?:\/\/arxiv.org\/abs\//, '').replace(/v\d+$/, '')
    if (tag(entry, 'title') === 'Error') throw new Error(`arXiv: ${tag(entry, 'summary')}`)
    return {
      id, arxiv: id, doi: tag(entry, 'arxiv:doi').toLowerCase() || null,
      title: tag(entry, 'title'), abstract: tag(entry, 'summary') || null,
      url: `https://arxiv.org/abs/${id}`, year: Number(tag(entry, 'published').slice(0, 4)) || null,
      authors: [...entry.matchAll(/<author>([\s\S]*?)<\/author>/g)].map(([, author]) => ({ id: '', name: tag(author, 'name') })),
    }
  })
}

function names(c: Case) { return new Set([c.name, ...(c.aliases ?? [])].map(normalize)) }
export function selectAuthor(authors: Work['authors'], allowed: Set<string>) {
  const matches = authors.filter((author) => [author.name, ...(author.aliases ?? [])].some((name) => allowed.has(normalize(name))) && author.id)
  const unique = [...new Map(matches.map((author) => [author.id, author])).values()]
  if (unique.length !== 1) throw new Error(`Expected one matching author on seed paper; found ${unique.length}`)
  return unique[0]
}

// Only used on a known seed paper, never to merge author profiles by name.
// An abbreviated first name or an omitted middle name is compatible, not proof of identity.
export function compatibleName(a: string, b: string) {
  function parts(name: string) {
    const comma = name.split(',')
    if (comma.length === 2) name = `${comma[1]} ${comma[0]}`
    return name.normalize('NFKD').replace(/[Łł]/g, 'l').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  }
  const left = parts(a)
  const right = parts(b)
  const compatible = (x: string, y: string) => x === y || (Math.min(x.length, y.length) === 1 && x[0] === y[0])
  if (left.length < 2 || right.length < 2 || left.at(-1) !== right.at(-1) || !compatible(left[0]!, right[0]!)) return false
  const midsA = left.slice(1, -1)
  const midsB = right.slice(1, -1)
  return midsA.every((part, i) => !midsB[i] || compatible(part, midsB[i]))
}

function seedAuthor(work: Work, c: Case) {
  try { return { author: selectAuthor(work.authors, names(c)), match: 'exact-name-or-raw-byline' } }
  catch {
    const compatible = work.authors.filter((a) => a.id && [c.name, ...(c.aliases ?? [])].some((name) => compatibleName(a.name, name)))
    const unique = [...new Map(compatible.map((a) => [a.id, a])).values()]
    if (unique.length !== 1) throw new Error(`Expected one compatible author on seed paper; found ${unique.length}`)
    return { author: unique[0], match: 'unique-compatible-name-on-seed-needs-review' }
  }
}

function doi(value: string | null | undefined) { return value?.replace(/^https?:\/\/(?:dx\.)?doi.org\//i, '').toLowerCase() || null }
function toOpenAlex(work: Json): Work {
  const urls = [work.doi, ...(work.locations ?? []).flatMap((l: Json) => [l.landing_page_url, l.pdf_url])].filter(Boolean)
  const arxiv = urls.map((url: string) => url.match(/arxiv.org\/(?:abs|pdf)\/(.+?)(?:\.pdf)?(?:[?#]|$)/i)?.[1] ?? url.match(/10\.48550\/arxiv\.(.+)$/i)?.[1]).find(Boolean)?.replace(/v\d+$/, '') ?? null
  let abstract = null
  let abstractError: string | undefined
  try { abstract = abstractText(work.abstract_inverted_index) }
  catch (err) { abstractError = String(err) }
  return {
    id: work.id, title: work.title ?? '', abstract, abstractError,
    url: work.doi ?? work.primary_location?.landing_page_url ?? work.best_oa_location?.landing_page_url ?? null,
    doi: doi(work.doi), arxiv, year: work.publication_year ?? null,
    authors: (work.authorships ?? []).map((a: Json) => ({ id: a.author.id, name: a.author.display_name, aliases: a.raw_author_name ? [a.raw_author_name] : [] })),
  }
}
function toSemantic(work: Json): Work {
  return {
    id: work.paperId, title: work.title ?? '', abstract: work.abstract?.trim() || null,
    url: work.externalIds?.ArXiv ? `https://arxiv.org/abs/${work.externalIds.ArXiv}` : work.externalIds?.DOI ? `https://doi.org/${work.externalIds.DOI}` : work.url ?? null,
    doi: doi(work.externalIds?.DOI), arxiv: work.externalIds?.ArXiv?.replace(/v\d+$/, '') ?? null,
    year: work.year ?? null, authors: (work.authors ?? []).map((a: Json) => ({ id: a.authorId, name: a.name })),
  }
}
export function sameWork(a: Work, b: Work) {
  return Boolean((a.doi && a.doi === b.doi) || (a.arxiv && a.arxiv === b.arxiv) || (normalize(a.title) && normalize(a.title) === normalize(b.title)))
}

const OA = 'https://api.openalex.org'
const S2 = 'https://api.semanticscholar.org/graph/v1'
const AX = 'https://export.arxiv.org/api/query'
const oaFields = 'id,title,doi,publication_year,abstract_inverted_index,authorships,primary_location,best_oa_location,locations'
const s2Fields = 'title,abstract,url,year,externalIds,authors'
const delay = (ms: number) => new Promise((done) => setTimeout(done, ms))

export async function run(options: { out: string; suite: string; offline: boolean; refresh: boolean; author?: string }) {
  const out = resolve(options.out)
  const rawDir = join(out, 'raw')
  await mkdir(rawDir, { recursive: true })
  const suite: Case[] = JSON.parse(await readFile(options.suite, 'utf8'))
  const selected = suite.filter((c) => !options.author || normalize(c.name).includes(normalize(options.author)))
  if (!selected.length) throw new Error('No matching suite author')
  const requests: Json[] = []
  const last = new Map<string, number>()

  async function request(base: string, params: Record<string, string | number> = {}): Promise<string> {
    const url = new URL(base)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
    const publicUrl = url.href
    const file = createHash('sha256').update(publicUrl).digest('hex') + '.json'
    const path = join(rawDir, file)
    if (!options.refresh || options.offline) {
      try {
        const cached = JSON.parse(await readFile(path, 'utf8'))
        if (options.offline || (cached.status >= 200 && cached.status < 300)) {
          requests.push({ url: publicUrl, status: cached.status, cached: true, fetchedAt: cached.fetchedAt, file })
          if (cached.status < 200 || cached.status >= 300) throw new Error(`HTTP ${cached.status} ${publicUrl}`)
          return cached.body
        }
      } catch (err) {
        if (options.offline) throw err
      }
    }
    const headers: Record<string, string> = { 'User-Agent': 'Talk2Arxiv-author-index-spike/1.0 (+https://talk2arxiv.org)' }
    if (url.origin === OA && process.env.OPENALEX_API_KEY) url.searchParams.set('api_key', process.env.OPENALEX_API_KEY)
    if (url.origin === 'https://api.semanticscholar.org' && process.env.SEMANTIC_SCHOLAR_API_KEY) headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY
    const interval = url.origin === new URL(AX).origin ? 3100 : 1200
    for (let attempt = 0; attempt < 3; attempt++) {
      await delay(Math.max(0, (last.get(url.origin) ?? 0) + interval - Date.now()))
      last.set(url.origin, Date.now())
      const start = Date.now()
      let status = 0
      let body = ''
      let retryAfter = 0
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) })
        status = response.status
        retryAfter = Number(response.headers.get('retry-after')) * 1000 || 0
        body = await response.text()
      } catch (err) { body = err instanceof Error ? err.message : String(err) }
      const record = { url: publicUrl, fetchedAt: new Date().toISOString(), status, elapsedMs: Date.now() - start, attempt, body }
      await writeFile(path, JSON.stringify(record, null, 2) + '\n')
      requests.push({ ...record, body: undefined, file })
      if (status >= 200 && status < 300) return body
      if ((status === 0 || status === 429 || status >= 500) && attempt < 2) {
        // Long Retry-After values end this probe rather than violating the server's request.
        if (retryAfter > 30_000) throw new Error(`HTTP ${status}; retry after ${retryAfter / 1000}s: ${publicUrl}`)
        await delay(Math.max(retryAfter, 3000 * 2 ** attempt))
        continue
      }
      throw new Error(`HTTP ${status}: ${publicUrl}`)
    }
    throw new Error('Retry budget exhausted')
  }
  async function json(base: string, params: Record<string, string | number> = {}) { return JSON.parse(await request(base, params)) }

  async function openalex(c: Case): Promise<Result> {
    const result: Result = { provider: 'openalex', works: [], pages: 0, complete: false }
    try {
      let seed: Json
      let method = 'doi'
      let directError: string | undefined
      try { seed = await json(`${OA}/works/https://doi.org/${c.seed.doi ?? `10.48550/arXiv.${c.seed.arxiv}`}`) }
      catch (err) { directError = String(err) }
      if (!seed) {
        method = 'exact-title-and-author'
        const search = await json(`${OA}/works`, { search: c.seed.title!, 'per-page': 25 })
        const candidates = search.results.filter((w: Json) => normalize(w.title ?? '') === normalize(c.seed.title!))
        const matches = candidates.filter((w: Json) => { try { seedAuthor(toOpenAlex(w), c); return true } catch { return false } })
        result.resolution = { method, directError, candidates: candidates.map((w: Json) => ({ id: w.id, title: w.title, doi: w.doi, authors: toOpenAlex(w).authors })) }
        // Different versions may have separate records. Never silently choose one.
        const ids = new Set(matches.map((w: Json) => seedAuthor(toOpenAlex(w), c).author.id))
        if (ids.size !== 1 || !matches.length) throw new Error(`Seed title lookup yielded ${ids.size} author identities across ${matches.length} matching records`)
        seed = matches[0]
      }
      const { author, match } = seedAuthor(toOpenAlex(seed), c)
      result.resolution = { ...result.resolution, method, authorMatch: match, directError, seedId: seed.id, seedTitle: seed.title, seedAuthors: toOpenAlex(seed).authors }
      result.author = await json(`${OA}/authors/${author.id.split('/').pop()}`)
      let cursor: string | null = '*'
      const cursors = new Set<string>()
      while (cursor && result.pages < 100) {
        if (cursors.has(cursor)) throw new Error('Repeated pagination cursor')
        cursors.add(cursor)
        const page = await json(`${OA}/works`, { filter: `authorships.author.id:${author.id}`, 'per-page': 200, cursor, select: oaFields })
        result.pages++
        result.total = page.meta.count
        result.works.push(...page.results.map(toOpenAlex))
        cursor = page.meta.next_cursor
        if (!page.results.length || !cursor) { result.complete = true; break }
      }
      const candidates = await json(`${OA}/authors`, { search: c.name, 'per-page': 5 })
      result.resolution.nameSearch = { count: candidates.meta.count, top: candidates.results.map((a: Json) => ({ id: a.id, name: a.display_name, worksCount: a.works_count, orcid: a.orcid })) }
    } catch (err) { result.error = String(err) }
    return result
  }

  async function semantic(c: Case): Promise<Result> {
    const result: Result = { provider: 'semantic-scholar', works: [], pages: 0, complete: false }
    try {
      let seed: Json
      let method = 'external-id'
      let directError: string | undefined
      try { seed = await json(`${S2}/paper/${c.seed.arxiv ? `ARXIV:${c.seed.arxiv}` : `DOI:${c.seed.doi}`}`, { fields: s2Fields }) }
      catch (err) { directError = String(err) }
      if (!seed) {
        method = 'exact-title-and-author'
        const search = await json(`${S2}/paper/search`, { query: c.seed.title!, fields: s2Fields, limit: 25 })
        const candidates = search.data.filter((w: Json) => normalize(w.title) === normalize(c.seed.title!))
        const matches = candidates.filter((w: Json) => { try { seedAuthor(toSemantic(w), c); return true } catch { return false } })
        const ids = new Set(matches.map((w: Json) => seedAuthor(toSemantic(w), c).author.id))
        result.resolution = { method, directError, candidates: candidates.map(toSemantic) }
        if (ids.size !== 1 || !matches.length) throw new Error(`Seed title lookup yielded ${ids.size} author identities across ${matches.length} matching records`)
        seed = matches[0]
      }
      const { author, match } = seedAuthor(toSemantic(seed), c)
      result.resolution = { ...result.resolution, method, authorMatch: match, directError, seedId: seed.paperId, seedTitle: seed.title, seedAuthors: toSemantic(seed).authors }
      result.author = await json(`${S2}/author/${author.id}`, { fields: 'name,paperCount,affiliations,externalIds,url' })
      let offset = 0
      while (result.pages < 100) {
        const page = await json(`${S2}/author/${author.id}/papers`, { fields: s2Fields, limit: 100, offset })
        result.pages++
        result.works.push(...page.data.map(toSemantic))
        if (page.next === undefined || page.next === null) { result.complete = true; break }
        if (page.next <= offset) throw new Error('Non-advancing pagination offset')
        offset = page.next
      }
      result.total = result.author.paperCount
    } catch (err) { result.error = String(err) }
    return result
  }

  async function arxiv(c: Case): Promise<Result> {
    const result: Result = { provider: 'arxiv-name-search', works: [], pages: 0, complete: false }
    try {
      const query = [...new Set([c.name, ...(c.aliases ?? [])])].map((name) => `au:"${name.replace(/[.]/g, '').replace(/ /g, '_')}"`).join(' OR ')
      for (let start = 0; result.pages < 100; start += 200) {
        const xml = await request(AX, { search_query: query, start, max_results: 200, sortBy: 'submittedDate', sortOrder: 'descending' })
        result.pages++
        const rawTotal = tag(xml, 'opensearch:totalResults')
        const total = Number(rawTotal)
        if (!rawTotal || !Number.isFinite(total)) throw new Error('Missing totalResults')
        result.total = total
        const works = parseArxiv(xml)
        result.works.push(...works)
        if (start + works.length >= total) { result.complete = true; break }
        if (!works.length) throw new Error('Empty page before end of results')
      }
    } catch (err) { result.error = String(err) }
    return result
  }

  async function check(c: Case, ref: Ref) {
    try {
      let work: Work
      if (ref.arxiv) {
        const entries = parseArxiv(await request(AX, { id_list: ref.arxiv }))
        if (entries.length !== 1 || entries[0].arxiv !== ref.arxiv) throw new Error('Unexpected reference paper')
        work = entries[0]
      } else {
        const data = await json(`https://api.biorxiv.org/details/biorxiv/${ref.doi}`)
        const entry = data.collection?.at(-1)
        if (!entry || doi(entry.doi) !== doi(ref.doi)) throw new Error('Missing bioRxiv reference')
        work = { id: entry.doi, doi: doi(entry.doi), arxiv: null, title: entry.title, abstract: entry.abstract || null, url: `https://doi.org/${entry.doi}`, year: Number(entry.date?.slice(0, 4)) || null, authors: entry.authors.split(';').map((name: string) => ({ id: '', name: name.trim() })) }
      }
      // bioRxiv may return family-first abbreviated names. Preserve them for human review.
      const verifiedAuthor = work.authors.some((a) => names(c).has(normalize(a.name)))
      const compatibleAuthor = work.authors.some((a) => [c.name, ...(c.aliases ?? [])].some((name) => compatibleName(a.name, name)))
      return { ref, work, verifiedAuthor, compatibleAuthor, authorReviewRequired: !verifiedAuthor }
    } catch (err) { return { ref, error: String(err) } }
  }

  async function bibliography(c: Case): Promise<Result | null> {
    if (!c.bibliography) return null
    const result: Result = { provider: 'author-website', works: [], pages: 0, complete: false }
    try {
      // This small parser is specific to the supplied neherlab author page, not a general scraper.
      const html = await request(c.bibliography)
      for (const [, article] of html.matchAll(/<article>([\s\S]*?)<\/article>/g)) {
        const first = article.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/)
        if (!first) continue
        const title = decodeXml(first[2].replace(/<[^>]+>/g, '')).trim()
        const url = new URL(first[1], c.bibliography).href
        const identifier = article.match(/href="https?:\/\/(?:dx\.)?doi.org\/([^"]+)"/)?.[1] ?? null
        result.works.push({ id: url, title, abstract: null, url, doi: doi(identifier), arxiv: null, authors: [{ id: c.bibliography, name: c.name }], year: Number(article.match(/datetime="(\d{4})/)?.[1]) || null })
      }
      if (!result.works.length) throw new Error('Author bibliography parser found no works')
      result.pages = 1
      result.total = result.works.length
      result.complete = true
      result.resolution = { method: 'curated-author-website', url: c.bibliography, caveat: 'All entries on this page, not a claim of every publication ever authored' }
    } catch (err) { result.error = String(err) }
    return result
  }

  const results: Json[] = []
  for (const c of selected) {
    console.log(`Testing ${c.name} ...`)
    const started = Date.now()
    const settled = await Promise.allSettled([openalex(c), semantic(c), c.negative ? Promise.resolve(null) : arxiv(c), bibliography(c)])
    const providers = settled.map((r) => { if (r.status === 'rejected') throw r.reason; return r.value }).filter((r): r is Result => r !== null)
    const checks: Awaited<ReturnType<typeof check>>[] = []
    for (const ref of c.checks) checks.push(await check(c, ref))
    const precisionChecks: Json[] = []
    for (const audit of c.precisionChecks ?? []) {
      try {
        const html = await request(audit.sourceUrl)
        const authors = [...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([meta]) => {
          const attrs = Object.fromEntries([...meta.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map((m) => [m[1], m[2] ?? m[3] ?? m[4]]))
          return attrs.name === 'citation_author' && attrs.content ? [decodeXml(attrs.content)] : []
        })
        const record = providers.find((p) => p.provider === audit.provider)?.works.find((w) => w.id === audit.id)
        precisionChecks.push({ ...audit, returnedAsAuthorWork: Boolean(record), providerAuthors: record?.authors, sourceAuthors: authors, sourceDisagrees: authors.length ? !authors.some((a) => [c.name, ...(c.aliases ?? [])].some((name) => compatibleName(a, name))) : null })
      } catch (err) { precisionChecks.push({ ...audit, error: String(err) }) }
    }
    const stats = providers.map((p) => {
      const works = [...new Map(p.works.map((w) => [w.id, w])).values()]
      const titleGroups = new Map<string, Work[]>()
      for (const work of works) {
        const key = normalize(work.title)
        if (key) titleGroups.set(key, [...(titleGroups.get(key) ?? []), work])
      }
      const duplicates = [...titleGroups.values()].filter((group) => group.length > 1)
      const uniqueTitles = [...titleGroups.values()].map((group) => group[0])
      const confirmedChecks = checks.filter((check) => check.work && check.verifiedAuthor)
      const other = works.filter((w) => !(c.seed.arxiv && w.arxiv === c.seed.arxiv) && !(c.seed.doi && w.doi === c.seed.doi) && normalize(w.title) !== normalize(c.seed.title!))
      const sample = [...other].filter((w) => w.abstract).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 3)
      return {
        provider: p.provider, retrieved: p.works.length, uniqueIds: works.length, uniqueTitles: uniqueTitles.length,
        total: p.total, pages: p.pages, paginationComplete: p.complete,
        profileReportedTotal: p.author?.works_count ?? p.author?.paperCount,
        countMatches: p.total === works.length, withAbstract: works.filter((w) => w.abstract).length,
        withLink: works.filter((w) => w.url).length, withTitle: works.filter((w) => w.title).length,
        malformedAbstracts: works.filter((w) => w.abstractError).map(({ id, title, abstractError }) => ({ id, title, abstractError })),
        sameTitleGroups: duplicates.map((group) => group.map(({ id, title, doi, arxiv }) => ({ id, title, doi, arxiv }))),
        knownPaperChecks: checks.map((ch) => ({ ...ch, found: ch.work ? works.some((w) => sameWork(w, ch.work!)) : null })),
        verifiedCheckCount: confirmedChecks.length,
        verifiedCheckHits: confirmedChecks.filter((ch) => works.some((w) => sameWork(w, ch.work!))).length,
        missingAbstractExamples: works.filter((w) => !w.abstract).slice(0, 10),
        otherPaperCount: other.length, contextChars: JSON.stringify(other.map(({ title, abstract, url, year }) => ({ title, abstract, url, year }))).length,
        sample, error: p.error,
      }
    })
    const comparison: Json[] = []
    for (const baseline of providers) {
      for (const target of providers) {
        if (baseline === target) continue
        const candidates = baseline.provider === 'arxiv-name-search' ? baseline.works.filter((w) => w.authors.some((a) => names(c).has(normalize(a.name)))) : baseline.works
        const unique = [...new Map(candidates.map((w) => [normalize(w.title) || w.id, w])).values()]
        const missing = unique.filter((w) => !target.works.some((other) => sameWork(w, other)))
        comparison.push({ baseline: baseline.provider, target: target.provider, baselineCount: unique.length, matched: unique.length - missing.length, missing, valid: baseline.complete && target.complete, caveat: 'Candidate coverage, not proven recall. Name collisions, title changes and provider mistakes need human review.' })
      }
    }
    const result = { case: c, elapsedMs: Date.now() - started, providers, stats, comparison, precisionChecks }
    results.push(result)
    console.log(stats.map((s) => `  ${s.provider}: ${s.uniqueIds}/${s.total ?? '?'} records, ${s.withAbstract} abstracts, ${s.verifiedCheckHits}/${s.verifiedCheckCount} verified checks${s.error ? `; ${s.error}` : ''}`).join('\n'))
    await writeFile(join(out, 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), options, results, requests }, null, 2) + '\n')
    const slug = normalize(c.name)
    await writeFile(join(out, `${slug}.context.json`), JSON.stringify(providers.filter((p) => p.provider === 'openalex' || p.provider === 'semantic-scholar').map((p) => ({ provider: p.provider, paginationComplete: p.complete, authorResolution: p.resolution, warning: 'Unverified candidate bibliography. May contain missing papers, duplicates, and incorrect authorships. This is not ready for automatic prompt injection.', error: p.error, papers: p.works.filter((w) => normalize(w.title) !== normalize(c.seed.title!) && !(c.seed.arxiv && w.arxiv === c.seed.arxiv) && !(c.seed.doi && w.doi === c.seed.doi)).map(({ title, abstract, url, year }) => ({ title, abstract, url, year })) })), null, 2) + '\n')
  }
  const report = [
    '# Author index spike', '', `Generated: ${new Date().toISOString()}`, '',
    'These are observed provider records, not a certified complete bibliography. Counts include versions, non-paper works, and potential author-profile errors. Abstracts are never synthesized.', '',
    '| Author | Provider | Records / reported | Abstracts | Pages complete | Verified holdouts |',
    '| --- | --- | ---: | ---: | --- | ---: |',
    ...results.flatMap((r) => r.stats.map((s: Json) => `| ${r.case.name} | ${s.provider} | ${s.uniqueIds} / ${s.total ?? '?'} | ${s.withAbstract} | ${s.paginationComplete} | ${s.verifiedCheckHits} / ${s.verifiedCheckCount} |`)), '',
    'Matching uses DOI, arXiv ID, or exact normalized title. Counts are unique provider IDs. Same-title groups are flagged rather than assumed equivalent. ArXiv name-search overlap is candidate coverage, not ground truth, especially for common names. Holdouts are independent source records with matching author names; even all passing cannot prove completeness. Pagination completion only means the provider returned its last page. Link presence does not test link reachability.', '',
    ...results.flatMap((r) => [
      `## ${r.case.name}`, '', r.case.reason, '',
      ...r.precisionChecks.flatMap((a: Json) => [`Precision check: ${a.provider} record ${a.id}. Returned in bibliography: ${a.returnedAsAuthorWork}. Source authors disagree: ${a.sourceDisagrees}. [Source](${a.sourceUrl}). ${a.error ?? ''}`.trimEnd(), '']),
      ...r.providers.flatMap((p: Result) => [`### ${p.provider}`, '', p.error ? `Error: ${p.error}` : `Resolved author: ${p.author?.id ?? p.author?.authorId ?? 'name search'}.`, '', `Resolution: ${JSON.stringify(p.resolution ?? {})}`, '',
        ...r.stats.find((s: Json) => s.provider === p.provider).sample.flatMap((w: Work) => [`**${w.title}** (${w.year})`, '', w.url ?? 'No link', '', w.abstract ?? 'Abstract unavailable', '']),
      ]),
      ...r.comparison.map((c: Json) => `${c.target} matches ${c.matched}/${c.baselineCount} candidate titles from ${c.baseline}. Both paginations finished: ${c.valid}.`), '',
    ]),
  ].join('\n')
  await writeFile(join(out, 'report.md'), report.trimEnd() + '\n')
  console.log(`Saved ${out}/report.md and results.json`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: {
    out: { type: 'string', default: 'spikes/author-index' },
    suite: { type: 'string', default: 'scripts/author-index-suite.json' },
    author: { type: 'string' }, offline: { type: 'boolean', default: false }, refresh: { type: 'boolean', default: false },
  } })
  run(values as Parameters<typeof run>[0]).catch((err) => { console.error(err); process.exitCode = 1 })
}
