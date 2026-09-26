import type { PaperMeta } from '../shared/types'
import { PaperError } from './paper'

// Title and abstract for link previews. arXiv's metadata API covers every
// paper, including ones with no HTML version, and it is much smaller than the
// full paper page.
const ARXIV_API = 'https://export.arxiv.org/api/query?id_list='
const USER_AGENT = 'Talk2Arxiv/2.0 (+https://talk2arxiv.org)'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

const memory = new Map<string, PaperMeta>()
const MEMORY_LIMIT = 256

export async function getPaperMeta(id: string, ctx: ExecutionContext): Promise<PaperMeta> {
  const hit = memory.get(id)
  if (hit) return hit

  const cacheKey = new Request(`https://cache.talk2arxiv.internal/meta/v1/${id}`)
  const cached = await caches.default.match(cacheKey)
  const meta: PaperMeta = cached ? await cached.json() : await fetchMeta(id)
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

async function fetchMeta(id: string): Promise<PaperMeta> {
  const response = await fetch(ARXIV_API + encodeURIComponent(id), {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) throw new PaperError('arXiv is not responding. Try again soon.', 502)

  const entry = (await response.text()).match(/<entry>([\s\S]*?)<\/entry>/)?.[1]
  const title = entry && tagText(entry, 'title')
  // For unknown IDs, arXiv returns an entry whose title is "Error".
  if (!title || title === 'Error') throw new PaperError(`arXiv has no paper "${id}".`, 404)

  return { id, title, abstract: tagText(entry, 'summary') ?? '' }
}

function tagText(xml: string, tag: string) {
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
