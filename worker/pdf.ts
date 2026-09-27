import { sourceOf, sourcePdfUrl, SOURCE_NAMES } from '../shared/papers'
import { USER_AGENT as ARXIV_USER_AGENT } from './arxiv'
import { USER_AGENT as BIORXIV_USER_AGENT } from './biorxiv'
import { fetchWithRetry } from './fetch'
import { PaperError } from './paper'

// The PDF fallback, for papers with no HTML version: brand-new bioRxiv
// preprints and arXiv papers that arXiv did not render.

// A Worker has 128 MB of memory. Papers are almost always far smaller.
const MAX_PDF_BYTES = 40 * 1024 * 1024
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

export async function getPdf(id: string, ctx: ExecutionContext): Promise<Response> {
  const source = sourceOf(id) ?? 'arxiv'
  const cacheKey = new Request(`https://cache.talk2arxiv.internal/pdf/v1/${id}`)
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  let response: Response
  try {
    response = await fetchWithRetry(sourcePdfUrl(id), {
      headers: { 'User-Agent': source === 'biorxiv' ? BIORXIV_USER_AGENT : ARXIV_USER_AGENT },
    })
  } catch {
    throw new PaperError(`${SOURCE_NAMES[source]} is not responding. Try again soon.`, 502)
  }
  if (response.status === 429) throw new PaperError(`${SOURCE_NAMES[source]} is busy right now. Try again in a minute.`, 503)
  // Unknown papers come back as 403/404, or as an HTML error page.
  const isPdf = response.headers.get('Content-Type')?.includes('pdf')
  if (!response.ok || !isPdf) throw new PaperError(`${SOURCE_NAMES[source]} has no paper "${id}".`, 404)
  if (Number(response.headers.get('Content-Length') ?? 0) > MAX_PDF_BYTES) {
    throw new PaperError('This PDF is too large to open here. Read it on the source site instead.', 413)
  }

  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new PaperError('This PDF is too large to open here. Read it on the source site instead.', 413)
  }
  const pdf = new Response(bytes, {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
  })
  ctx.waitUntil(caches.default.put(cacheKey, pdf.clone()))
  return pdf
}

// A data: URL for the PDF, for when the model provider cannot fetch it by URL.
export async function pdfDataUrl(id: string, ctx: ExecutionContext) {
  const bytes = new Uint8Array(await (await getPdf(id, ctx)).arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:application/pdf;base64,${btoa(binary)}`
}
