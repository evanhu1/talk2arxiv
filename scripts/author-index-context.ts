// Compact the unique bibliography: top 100 by citations, abstracts for the top 10 only.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { createHash } from 'node:crypto'
import { normalize } from './author-index-spike.ts'
import type { buildUnique } from './author-index-unique.ts'

type Unique = ReturnType<typeof buildUnique>
type Paper = Unique['papers'][number]
type Counts = Record<string, number | null>
type ContextPaper = { title: string; url: string | null; year: number | null; citations: number | null; abstract?: string }
const validCount = (count: unknown): count is number => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0

export function rankPapers(papers: Paper[], counts: Counts) {
  return papers.map((paper) => {
    const values = paper.sources.filter((s) => s.provider === 'openalex').map((s) => counts[s.id]).filter(validCount)
    // Versions may share citing papers: summing their counts would double-count citations.
    return { ...paper, citations: values.length ? Math.max(...values) : null }
  }).sort((a, b) => (b.citations ?? -1) - (a.citations ?? -1) || (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title))
}

export function compactContext(papers: Paper[], counts: Counts): ContextPaper[] {
  return rankPapers(papers, counts).slice(0, 100).map((p, index) => ({
    title: p.title, url: p.url, year: p.year, citations: p.citations,
    // Strict top 10 by rank. Do not substitute rank 11 when a top-10 abstract is missing.
    ...(index < 10 && p.abstract ? { abstract: p.abstract } : {}),
  }))
}

export function renderContext(author: string, papers: ContextPaper[], omittedPapers = 0) {
  return [`Other papers by ${author} (most cited first; abstracts only for the top 10 when available):`, '',
    ...papers.map((p, i) => `${i + 1}. ${JSON.stringify(p.title)} — ${p.url ?? 'link unavailable'} (${p.year ?? 'year unknown'}; ${p.citations ?? 'unknown'} citations)${p.abstract ? `\n   Abstract: ${p.abstract.replace(/\s+/g, ' ').trim()}` : ''}`),
    ...(omittedPapers > 0 ? ['', `+ ${omittedPapers} more`] : []),
  ].join('\n').trimEnd() + '\n'
}

async function getCounts(ids: string[], out: string, options: { offline: boolean; refresh: boolean }) {
  const path = join(out, 'citation-counts.json')
  let cache: { counts: Counts; fetchedAt: string | null } = { counts: {}, fetchedAt: null }
  try { cache = JSON.parse(await readFile(path, 'utf8')) } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  const missing = options.refresh ? ids : ids.filter((id) => !Object.hasOwn(cache.counts, id))
  if (options.offline && missing.length) throw new Error(`Missing citation counts for ${missing.length} records; run once without --offline`)
  await mkdir(join(out, 'raw'), { recursive: true })
  for (let start = 0; start < missing.length; start += 100) {
    const batch = missing.slice(start, start + 100)
    const url = new URL('https://api.openalex.org/works')
    url.searchParams.set('filter', `openalex_id:${batch.map((id) => id.split('/').pop()).join('|')}`)
    url.searchParams.set('select', 'id,cited_by_count')
    url.searchParams.set('per-page', '100')
    const publicUrl = url.href
    if (process.env.OPENALEX_API_KEY) url.searchParams.set('api_key', process.env.OPENALEX_API_KEY)
    let payload: { results: { id: string; cited_by_count: number }[] } | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((done) => setTimeout(done, attempt ? 3000 * 2 ** (attempt - 1) : 1200))
      const response = await fetch(url, { signal: AbortSignal.timeout(25_000), headers: { 'User-Agent': 'Talk2Arxiv-author-index-spike/1.0 (+https://talk2arxiv.org)' } })
      const body = await response.text()
      const file = `citations-${createHash('sha256').update(publicUrl).digest('hex')}.json`
      await writeFile(join(out, 'raw', file), JSON.stringify({ url: publicUrl, fetchedAt: new Date().toISOString(), status: response.status, body }, null, 2) + '\n')
      if (response.ok) { payload = JSON.parse(body); break }
      const retryHeader = response.headers.get('retry-after')
      const retryMs = retryHeader ? (/^\d+$/.test(retryHeader) ? Number(retryHeader) * 1000 : Date.parse(retryHeader) - Date.now()) : 0
      if ((response.status !== 429 && response.status < 500) || attempt === 2 || retryMs > 30_000) throw new Error(`OpenAlex citation lookup failed: HTTP ${response.status}`)
      if (retryMs > 0) await new Promise((done) => setTimeout(done, retryMs))
    }
    if (!payload || !Array.isArray(payload.results)) throw new Error('Invalid OpenAlex citation response')
    for (const id of batch) cache.counts[id] = null
    for (const row of payload.results) if (batch.includes(row.id) && validCount(row.cited_by_count)) cache.counts[row.id] = row.cited_by_count
    cache.fetchedAt = new Date().toISOString()
    await writeFile(path, JSON.stringify(cache, null, 2) + '\n')
    console.log(`Citation counts: ${Math.min(start + 100, missing.length)}/${missing.length} records fetched`)
  }
  return cache
}

async function main() {
  const { values } = parseArgs({ options: {
    input: { type: 'string', default: 'spikes/author-index/unique-results.json' },
    out: { type: 'string', default: 'spikes/author-index' },
    offline: { type: 'boolean', default: false }, refresh: { type: 'boolean', default: false },
  } })
  if (values.offline && values.refresh) throw new Error('--offline and --refresh cannot be combined')
  const input = JSON.parse(await readFile(values.input!, 'utf8')) as { generatedAt: string; results: Unique[] }
  const out = resolve(values.out!)
  await mkdir(out, { recursive: true })
  const ids = [...new Set(input.results.flatMap((r) => r.papers.flatMap((p) => p.sources.filter((s) => s.provider === 'openalex').map((s) => s.id))))].sort()
  const { counts, fetchedAt } = await getCounts(ids, out, { offline: values.offline, refresh: values.refresh })
  const results = []
  for (const result of input.results) {
    const papers = compactContext(result.papers, counts)
    const omittedPapers = result.papers.length - papers.length
    const full = renderContext(result.author, rankPapers(result.papers, counts).map((p) => ({ ...p, abstract: p.abstract ?? undefined })))
    const text = renderContext(result.author, papers, omittedPapers)
    const metrics = {
      papers: papers.length, omittedPapers, abstracts: papers.filter((p) => p.abstract).length,
      unknownCitationCounts: papers.filter((p) => p.citations === null).length,
      fullChars: full.length, compactChars: text.length,
      fullEstimatedTokens: Math.ceil(full.length / 3.2), compactEstimatedTokens: Math.ceil(text.length / 3.2),
      savedPercent: Math.round((1 - text.length / full.length) * 100),
    }
    results.push({ author: result.author, papers, omittedPapers, metrics })
    await writeFile(join(out, `${normalize(result.author)}.ranked.json`), JSON.stringify({ author: result.author, papers, omittedPapers }, null, 2) + '\n')
    await writeFile(join(out, `${normalize(result.author)}.context.md`), text)
    console.log(`${result.author}: ${papers.length} papers, ${metrics.abstracts} abstracts; ~${metrics.fullEstimatedTokens} → ~${metrics.compactEstimatedTokens} tokens (${metrics.savedPercent}% smaller)`)
  }
  await writeFile(join(out, 'ranked-results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceSnapshot: input.generatedAt, citationCountsFetchedAt: fetchedAt, results }, null, 2) + '\n')
  await writeFile(join(out, 'context-report.md'), [
    '# Citation-ranked author context', '',
    'Each author has one unique list, sorted by OpenAlex citation count descending and capped at 100 papers. Only ranks 1–10 include an available abstract. Ranks 11–100 retain title, link, year, and citation count; the abstract field is absent. When papers are omitted, the context ends with “+ N more” and the JSON records omittedPapers. A missing top-10 abstract does not promote rank 11. The current paper remains excluded.', '',
    'For merged versions, use the maximum citation count rather than adding counts. Unknown counts rank after known counts, including zero. Ties use newest year, then title. Citation counts are a popularity signal and favor older papers.', '',
    `Citation counts fetched: ${fetchedAt}. Token estimates use characters / 3.2, not an exact tokenizer. The comparison uses the full bibliography with all available abstracts versus the top 100 papers with abstracts only for the top 10.`, '',
    '| Author | Papers included | Papers omitted | Abstracts included | Full bibliography tokens (est.) | Compact tokens (est.) | Reduction |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...results.map((r) => `| ${r.author} | ${r.metrics.papers} | ${r.omittedPapers} | ${r.metrics.abstracts} | ${r.metrics.fullEstimatedTokens.toLocaleString('en-US')} | ${r.metrics.compactEstimatedTokens.toLocaleString('en-US')} | ${r.metrics.savedPercent}% |`), '',
    ...results.flatMap((r) => [
      `## ${r.author}`, '', `Full context: [${normalize(r.author)}.context.md](${normalize(r.author)}.context.md). Unknown citation counts: ${r.metrics.unknownCitationCounts}.`, '',
      ...r.papers.slice(0, 10).map((p, i) => `${i + 1}. [${p.title.replace(/[\[\]]/g, '')}](${p.url ?? '#'}) — ${p.citations ?? 'unknown'} citations; ${p.abstract ? 'abstract included' : 'abstract unavailable'}`), '',
    ]),
  ].join('\n').trimEnd() + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => { console.error(err); process.exitCode = 1 })
}
