// Reduce the spike's saved responses to a practical, deduplicated bibliography.
// No network calls, new dependencies, or changes to the app's LLM prompt.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { normalize, compatibleName } from './author-index-spike.ts'

type Author = { id: string | null; name: string; aliases?: string[] }
export type Work = { id: string; title: string; abstract: string | null; url: string | null; year: number | null; doi: string | null; arxiv: string | null; authors: Author[] }
type Entry = Work & { provider: string }
type Group = { entries: Entry[]; keys: Set<string>; titles: Set<string> }
type Input = {
  case: { name: string; aliases?: string[]; seed: { title: string; arxiv?: string; doi?: string } }
  providers: { provider: string; works: Work[]; complete: boolean }[]
  stats?: { knownPaperChecks: { work?: Work; verifiedAuthor?: boolean; compatibleAuthor?: boolean }[] }[]
}

const cleanTitle = (title: string) => title.replace(/\\[nr]/g, ' ').replace(/\s+/g, ' ').trim()
const doiKey = (doi: string) => doi.replace(/^https?:\/\/(?:dx\.)?doi.org\//i, '').toLowerCase()
const arxivKey = (id: string) => id.replace(/v\d+$/, '').toLowerCase()
const titleKey = (title: string) => normalize(cleanTitle(title))
const keys = (w: Work) => [
  ...(w.doi ? [`doi:${doiKey(w.doi)}`] : []),
  ...(w.arxiv ? [`arxiv:${arxivKey(w.arxiv)}`] : []),
  ...(titleKey(w.title) ? [`title:${titleKey(w.title)}`] : []),
]
const excluded = (w: Work) => !w.title?.trim() || /^(?:erratum|corrigendum|retraction|correction)\s*[:(]|^(?:guest editorial|editorial:|supplementary (?:data|material)|peer review (?:file|report))/i.test(w.title)

function matching(groups: Group[], work: Work) {
  const ids = keys(work)
  return groups.filter((g) => ids.some((id) => g.keys.has(id)))
}

// Merge every matching group: a journal record can bridge a preprint ID and a renamed title.
function add(groups: Group[], entry: Entry) {
  const matches = matching(groups, entry)
  const target = matches[0] ?? { entries: [], keys: new Set<string>(), titles: new Set<string>() }
  if (!matches.length) groups.push(target)
  for (const other of matches.slice(1)) {
    target.entries.push(...other.entries)
    for (const key of other.keys) target.keys.add(key)
    for (const title of other.titles) target.titles.add(title)
    groups.splice(groups.indexOf(other), 1)
  }
  if (!target.entries.some((e) => e.id === entry.id && e.provider === entry.provider)) target.entries.push(entry)
  for (const key of keys(entry)) target.keys.add(key)
  target.titles.add(cleanTitle(entry.title))
}

function typoMatch(a: string, b: string) {
  // A single inserted/deleted/substituted character in a sufficiently long title.
  if (a.length < 15 || b.length < 15 || Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length >= b.length) i++
    if (b.length >= a.length) j++
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

export function buildUnique(input: Input) {
  const groups: Group[] = []
  const allowed = new Set([input.case.name, ...(input.case.aliases ?? [])].map(normalize))
  const isTarget = (a: Author) => [a.name, ...(a.aliases ?? [])].some((n) => allowed.has(normalize(n)) || compatibleName(n, input.case.name))
  const provider = (name: string) => input.providers.find((p) => p.provider === name)?.works ?? []
  const openalex = provider('openalex')
  const primary = openalex.length ? 'openalex' : 'semantic-scholar'
  const base = provider(primary).filter((w) => !excluded(w) && (primary === 'openalex' || (w.abstract && (w.doi || w.arxiv) && w.authors.length <= 50)))
  const coauthors = new Set(base.flatMap((w) => w.authors.filter((a) => !isTarget(a)).flatMap((a) => [a.name, ...(a.aliases ?? [])]).map(normalize)))
  const hasKnownCoauthor = (w: Work) => w.authors.some((a) => !isTarget(a) && coauthors.has(normalize(a.name)))
  for (const work of base) add(groups, { ...work, provider: primary })

  const review: { provider: string; reason: string; work: Work }[] = []
  for (const work of provider('arxiv-name-search')) {
    if (excluded(work)) continue
    if (matching(groups, work).length || (work.authors.some(isTarget) && hasKnownCoauthor(work))) {
      add(groups, { ...work, provider: 'arxiv' })
    } else {
      review.push({ provider: 'arxiv', reason: 'Name match without an existing paper or known coauthor', work })
    }
  }
  // Semantic Scholar enriches accepted papers, but its uncorroborated records stay out.
  // This avoids the reference-list-as-authors failure found in the first spike.
  for (const work of provider('semantic-scholar')) {
    if (excluded(work)) continue
    if (matching(groups, work).length) add(groups, { ...work, provider: 'semantic-scholar' })
    else review.push({ provider: 'semantic-scholar', reason: 'Not corroborated by the primary bibliography or accepted arXiv records', work })
  }

  // Correct tiny title typos only when years and a non-target coauthor corroborate the match.
  for (let i = 0; i < groups.length; i++) {
    const a = groups[i]
    for (let j = groups.length - 1; j > i; j--) {
      const b = groups[j]
      if (![...a.titles].some((ta) => [...b.titles].some((tb) => typoMatch(titleKey(ta), titleKey(tb))))) continue
      const authors = new Set(a.entries.flatMap((w) => w.authors.filter((author) => !isTarget(author)).map((author) => normalize(author.name))))
      const corroborated = b.entries.some((w) => w.authors.some((author) => !isTarget(author) && authors.has(normalize(author.name))) && a.entries.some((v) => w.year && v.year && Math.abs(w.year - v.year) <= 3))
      if (!corroborated) continue
      a.entries.push(...b.entries)
      for (const key of b.keys) a.keys.add(key)
      for (const title of b.titles) a.titles.add(title)
      groups.splice(j, 1)
    }
  }

  const seedKeys = new Set([
    `title:${titleKey(input.case.seed.title)}`,
    ...(input.case.seed.doi ? [`doi:${doiKey(input.case.seed.doi)}`] : []),
    ...(input.case.seed.arxiv ? [`arxiv:${arxivKey(input.case.seed.arxiv)}`] : []),
  ])
  const allGroups = [...groups]
  const others = groups.filter((g) => ![...seedKeys].some((key) => g.keys.has(key)))
  const papers = others.map((group) => {
    const preferred = [...group.entries].sort((a, b) => (a.provider === 'arxiv' ? 0 : a.provider === 'openalex' ? 1 : 2) - (b.provider === 'arxiv' ? 0 : b.provider === 'openalex' ? 1 : 2))
    const abstract = preferred.find((w) => w.abstract?.trim())
    const arxiv = preferred.find((w) => w.arxiv)?.arxiv
    const doi = preferred.find((w) => w.doi)?.doi
    const years = preferred.map((w) => w.year).filter((year): year is number => year !== null)
    return {
      title: cleanTitle(preferred[0].title), abstract: abstract?.abstract ?? null,
      url: arxiv ? `https://arxiv.org/abs/${arxivKey(arxiv)}` : doi ? `https://doi.org/${doiKey(doi)}` : preferred.find((w) => w.url)?.url ?? null,
      year: years.length ? Math.min(...years) : null,
      abstractSource: abstract?.provider ?? null,
      sources: group.entries.map(({ id, provider, doi, arxiv }) => ({ id, provider, doi, arxiv })),
      alternateTitles: [...group.titles].filter((t) => t !== cleanTitle(preferred[0].title)),
    }
  }).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title))
  const references = provider('author-website')
  const coverage = references.length ? {
    matched: references.filter((w) => matching(allGroups, w).length).length,
    total: references.length,
    missing: references.filter((w) => !matching(allGroups, w).length).map(({ title, url }) => ({ title, url })),
  } : null
  return {
    author: input.case.name, primary, papers,
    metrics: {
      primaryRecords: base.length, uniqueIncludingSeed: allGroups.length, otherPapers: papers.length,
      withAbstract: papers.filter((p) => p.abstract).length,
      mergedRecords: allGroups.reduce((n, g) => n + g.entries.length - 1, 0),
      heldForReview: review.length, independentWebsiteCoverage: coverage,
    },
    review,
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    input: { type: 'string', default: 'spikes/author-index/results.json' },
    out: { type: 'string', default: 'spikes/author-index' },
  } })
  const data = JSON.parse(await readFile(values.input!, 'utf8'))
  const out = resolve(values.out!)
  await mkdir(out, { recursive: true })
  const results = data.results.map(buildUnique)
  for (const result of results) {
    await writeFile(join(out, `${normalize(result.author)}.unique.json`), JSON.stringify(result, null, 2) + '\n')
    console.log(`${result.author}: ${result.papers.length} unique other papers, ${result.metrics.withAbstract} with abstracts, ${result.metrics.heldForReview} uncorroborated candidates held out`)
  }
  await writeFile(join(out, 'unique-results.json'), JSON.stringify({ sourceSnapshot: data.generatedAt, generatedAt: new Date().toISOString(), results }, null, 2) + '\n')
  await writeFile(join(out, 'unique-report.md'), [
    '# Best-effort unique author papers', '',
    `Source snapshot: ${data.generatedAt}. This reduction uses the saved provider responses without new network requests.`, '',
    '| Author | Unique other papers | With abstract | Eligible primary records before merging |',
    '| --- | ---: | ---: | ---: |',
    ...results.map((r: ReturnType<typeof buildUnique>) => `| ${r.author} | ${r.metrics.otherPapers} | ${r.metrics.withAbstract} | ${r.metrics.primaryRecords} |`), '',
    'OpenAlex is the primary bibliography. arXiv contributes papers when a known coauthor corroborates the target name, and enriches existing matches. Semantic Scholar enriches matching accepted papers. Its uncorroborated records are held for review. The author website is held out for evaluation, never used to add papers.', '',
    'Versions merge by DOI, arXiv ID, or normalized title, including transitive matches. Single-character title typos require a shared non-target coauthor and nearby years. Explicit corrections, editorials and supplementary-material entries are excluded. The seed paper is excluded from the final context. Source IDs and alternate titles remain in each JSON entry.', '',
    'Counts are best-effort distinct works, not certified publication totals. Provider authorship errors and remaining title-change duplicates are possible. Missing abstracts remain null. Independent website coverage is recall against that reference page, not an overall accuracy or precision estimate.', '',
    ...results.flatMap((r: ReturnType<typeof buildUnique>) => [
      `## ${r.author}`, '',
      ...(r.metrics.independentWebsiteCoverage ? [`Independent author-page coverage (including seed): ${r.metrics.independentWebsiteCoverage.matched}/${r.metrics.independentWebsiteCoverage.total}.`, ''] : []),
      `Full output: [${normalize(r.author)}.unique.json](${normalize(r.author)}.unique.json)`, '',
      ...r.papers.slice(0, 5).flatMap((p) => [`### ${p.title}`, '', `${p.year ?? 'Unknown year'} · ${p.url ?? 'No link'}`, '', p.abstract ?? 'Abstract unavailable', '']),
    ]),
  ].join('\n').trimEnd() + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => { console.error(err); process.exitCode = 1 })
}
