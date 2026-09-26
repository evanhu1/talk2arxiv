import { sourceOf } from '../shared/papers'
import type { Paper } from '../shared/types'
import { fetchArxivPaper } from './arxiv'
import { fetchBiorxivPaper } from './biorxiv'

const CACHE_VERSION = 'v2'
// A versioned ID (1706.03762v7, 10.1101/...v2) never changes, so keep it longer.
const cacheTtl = (id: string) => (/v\d+$/.test(id) ? 60 * 60 * 24 * 30 : 60 * 60 * 24)

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

  const paper = sourceOf(id) === 'biorxiv' ? await fetchBiorxivPaper(id) : await fetchArxivPaper(id)
  const response = new Response(JSON.stringify(paper), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${cacheTtl(id)}`,
    },
  })
  ctx.waitUntil(cache.put(cacheKey, response))
  return paper
}

export interface ArticleTools {
  // Removes an element, such as a source site's buttons, from the output.
  drop: (el: Element) => void
}

// One streaming pass over the article that:
// - makes image and link URLs absolute, so the browser can load them, and
// - collects plain text, with each <math> replaced by its LaTeX source.
// `extend` adds source-specific handlers, which run before the shared ones.
export async function processArticle(
  article: string,
  baseUrl: string,
  extend: (rewriter: HTMLRewriter, tools: ArticleTools) => HTMLRewriter = (rewriter) => rewriter,
) {
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

  const rewriter = extend(new HTMLRewriter(), { drop: (el) => el.remove() })
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

export function extractTitle(page: string, text: string) {
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
export function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body] ?? entity
    const hex = body[1] === 'x' || body[1] === 'X'
    const codePoint = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
    return codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
  })
}
