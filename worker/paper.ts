import type { Paper } from '../shared/types'

// New-style (2401.12345v2) and old-style (hep-th/9711200) arXiv identifiers.
const ARXIV_ID = /^(\d{4}\.\d{4,5}|[a-z-]+(\.[A-Z]{2})?\/\d{7})(v\d+)?$/

export const isArxivId = (id: string) => ARXIV_ID.test(id)

// arXiv renders most papers since 2023 (and many older ones) as HTML5.
// ar5iv covers older papers that arXiv has not rendered.
const SOURCES = [
  (id: string) => `https://arxiv.org/html/${id}`,
  (id: string) => `https://ar5iv.labs.arxiv.org/html/${id}`,
]

const USER_AGENT = 'Talk2Arxiv/2.0 (+https://talk2arxiv.org)'

// Pages shorter than this are error or placeholder pages, not papers.
const MIN_TEXT_LENGTH = 1500

const CACHE_VERSION = 'v1'
const CACHE_TTL_SECONDS = 60 * 60 * 24

export interface LoadedPaper extends Paper {
  // Plain text with LaTeX math, for the model's context.
  text: string
}

export class PaperError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

// Isolates are reused between requests, so a small in-memory cache avoids
// fetching the same paper for the page load and each chat message. It holds
// finished papers, not promises: a request must not wait on another's I/O.
const memory = new Map<string, LoadedPaper>()
const MEMORY_LIMIT = 16

export async function getPaper(id: string, ctx: ExecutionContext): Promise<LoadedPaper> {
  const hit = memory.get(id)
  if (hit) return hit

  const paper = await loadPaper(id, ctx)
  memory.set(id, paper)
  if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value!)
  return paper
}

async function loadPaper(id: string, ctx: ExecutionContext): Promise<LoadedPaper> {
  const cacheKey = new Request(`https://cache.talk2arxiv.internal/paper/${CACHE_VERSION}/${id}`)
  const cache = caches.default
  const cached = await cache.match(cacheKey)
  if (cached) return cached.json()

  for (const source of SOURCES) {
    const paper = await fetchPaper(id, source(id))
    if (!paper) continue
    const response = new Response(JSON.stringify(paper), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    })
    ctx.waitUntil(cache.put(cacheKey, response))
    return paper
  }

  throw new PaperError(
    'arXiv has no HTML version of this paper. It may only be available as a PDF.',
    404,
  )
}

async function fetchPaper(id: string, url: string): Promise<LoadedPaper | null> {
  let response: Response
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } })
  } catch {
    return null
  }
  if (!response.ok) return null

  const page = await response.text()
  const start = page.indexOf('<article')
  const end = page.lastIndexOf('</article>')
  if (start < 0 || end < start) return null

  const article = page.slice(start, end + '</article>'.length)
  const { html, text } = await processArticle(article, response.url || url)
  if (text.length < MIN_TEXT_LENGTH) return null

  return { id, title: extractTitle(page, text), sourceUrl: response.url || url, html, text }
}

// One streaming pass over the article that:
// - makes image and link URLs absolute, so the browser can load them, and
// - collects plain text, with each <math> replaced by its LaTeX source.
async function processArticle(article: string, baseUrl: string) {
  const parts: string[] = []
  let skip = 0
  const push = (value: string) => {
    if (skip === 0) parts.push(value)
  }
  const skipContents = (el: Element) => {
    skip++
    el.onEndTag(() => {
      skip--
    })
  }
  const block = (el: Element) => {
    push('\n')
    el.onEndTag(() => push('\n'))
  }
  const absolute = (value: string) => {
    try {
      return new URL(decodeEntities(value), baseUrl).href
    } catch {
      return value
    }
  }

  const rewriter = new HTMLRewriter()
    .on('script, style, button, svg, annotation, annotation-xml', { element: skipContents })
    .on('math', {
      element(el) {
        const tex = el.getAttribute('alttext') ?? ''
        push(el.getAttribute('display') === 'block' ? `\n$$${tex}$$\n` : `$${tex}$`)
        skipContents(el)
      },
    })
    .on('h1, h2, h3, h4, h5, h6', {
      element(el) {
        const level = Math.min(Number(el.tagName[1]), 4)
        push(`\n\n${'#'.repeat(level)} `)
        el.onEndTag(() => push('\n'))
      },
    })
    .on('p, div, li, figure, figcaption, section, blockquote, table, tr, dt, dd', {
      element: block,
    })
    .on('td, th', { element: () => push(' | ') })
    .on('br', { element: () => push('\n') })
    .on('img[src], source[src]', {
      element(el) {
        el.setAttribute('src', absolute(el.getAttribute('src')!))
      },
    })
    .on('a[href]', {
      element(el) {
        const href = el.getAttribute('href')!
        if (href.startsWith('#')) return
        el.setAttribute('href', absolute(href))
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
      },
    })
    .onDocument({ text: (chunk) => push(chunk.text) })

  const html = await rewriter.transform(new Response(article)).text()
  const text = decodeEntities(parts.join(''))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { html, text }
}

function extractTitle(page: string, text: string) {
  const match = page.match(/<title>([\s\S]*?)<\/title>/i)
  const title = decodeEntities(match?.[1] ?? '')
    .replace(/^\s*\[[^\]]+\]\s*/, '') // ar5iv prefixes "[id] "
    .replace(/\s+/g, ' ')
    .trim()
  return title || text.split('\n')[0].replace(/^#+ /, '').slice(0, 200)
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}

// HTMLRewriter hands over raw source text, so entities are still encoded.
function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body] ?? entity
    const hex = body[1] === 'x' || body[1] === 'X'
    const codePoint = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
    return codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
  })
}
