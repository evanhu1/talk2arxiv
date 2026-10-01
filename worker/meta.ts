import { sourceOf } from '../shared/papers'
import type { PaperMeta } from '../shared/types'
import { USER_AGENT } from './arxiv'
import { fetchBiorxivPage, readMeta } from './biorxiv'
import { PaperError } from './paper'

// Title and abstract for link previews. For arXiv, the metadata API covers
// every paper, including ones with no HTML version, and it is much smaller
// than the full paper page. For bioRxiv, the abstract page has both in its
// <meta> tags.
const ARXIV_API = 'https://export.arxiv.org/api/query?id_list='
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

const memory = new Map<string, PaperMeta>()
const MEMORY_LIMIT = 256

export async function getPaperMeta(id: string, ctx: ExecutionContext): Promise<PaperMeta> {
  const hit = memory.get(id)
  if (hit) return hit

  const cacheKey = metaCacheKey(id)
  const cached = await caches.default.match(cacheKey)
  const meta: PaperMeta = cached
    ? await cached.json()
    : sourceOf(id) === 'biorxiv'
      ? await fetchBiorxivMeta(id)
      : await fetchArxivMeta(id)
  if (!cached) {
    const response = Response.json(meta, {
      headers: { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
    })
    ctx.waitUntil(caches.default.put(cacheKey, response))
  }

  memory.set(id, meta)
  if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value!)
  return meta
}

const metaCacheKey = (id: string) => new Request(`https://cache.talk2arxiv.internal/meta/v5/${id}`)

// Title, authors, and abstract from any bioRxiv article page.
export function biorxivMeta(id: string, page: string): PaperMeta {
  return {
    id,
    title: readMeta(page, 'citation_title')[0] || id,
    authors: readMeta(page, 'citation_author'),
    // The plain "description" tag is bioRxiv's site blurb. DC.Description is the abstract.
    abstract: readMeta(page, 'DC.Description')[0] ?? '',
  }
}

// Saves metadata learned while loading a paper, so link previews for it need
// no extra request to a rate-limited source.
export function rememberMeta(meta: PaperMeta, ctx: ExecutionContext) {
  memory.set(meta.id, meta)
  const response = Response.json(meta, { headers: { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` } })
  ctx.waitUntil(caches.default.put(metaCacheKey(meta.id), response))
}

// Crossref, the DOI registry, has every bioRxiv paper's title, authors, and
// abstract. It is fast and, unlike bioRxiv itself, not quick to rate-limit.
const CROSSREF_API = 'https://api.crossref.org/works/'
const CROSSREF_USER_AGENT = 'Talk2bioRxiv/2.0 (+https://talk2biorxiv.org)'

interface CrossrefWork {
  title?: string[]
  author?: { given?: string; family?: string; name?: string }[]
  abstract?: string
}

async function fetchCrossrefMeta(id: string): Promise<PaperMeta | null> {
  const doi = id.replace(/v\d+$/, '') // Crossref registers the DOI, not each version.
  try {
    const response = await fetch(CROSSREF_API + doi, {
      headers: { 'User-Agent': CROSSREF_USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    const work = ((await response.json()) as { message: CrossrefWork }).message
    const title = work.title?.[0]?.replace(/\s+/g, ' ').trim()
    if (!title) return null
    return {
      id,
      title,
      authors: (work.author ?? []).map((a) => a.name ?? [a.given, a.family].filter(Boolean).join(' ')),
      // The abstract is JATS XML: drop the tags and the "Abstract" heading.
      abstract: (work.abstract ?? '')
        .replace(/<jats:title>[\s\S]*?<\/jats:title>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }
  } catch {
    return null
  }
}

async function fetchBiorxivMeta(id: string): Promise<PaperMeta> {
  const fromCrossref = await fetchCrossrefMeta(id)
  if (fromCrossref) return fromCrossref
  const { page } = await fetchBiorxivPage(id)
  const title = readMeta(page, 'citation_title')[0]
  if (!title) throw new PaperError('bioRxiv has no paper with this DOI.', 404)
  return biorxivMeta(id, page)
}

async function fetchArxivMeta(id: string): Promise<PaperMeta> {
  const response = await fetch(ARXIV_API + encodeURIComponent(id), {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new PaperError('arXiv is not responding. Try again soon.', 502)

  const entry = (await response.text()).match(/<entry>([\s\S]*?)<\/entry>/)?.[1]
  const title = entry && tagText(entry, 'title')
  // For unknown IDs, arXiv returns an entry whose title is "Error".
  if (!title || title === 'Error') throw new PaperError(`arXiv has no paper "${id}".`, 404)

  const authors = [...entry.matchAll(/<author>\s*<name>([^<]*)<\/name>/g)].map((match) => match[1].trim())
  return { id, title, authors, abstract: tagText(entry, 'summary') ?? '' }
}

export function tagText(xml: string, tag: string) {
  const raw = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]
  if (raw === undefined) return null
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
