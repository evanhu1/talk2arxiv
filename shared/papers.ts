// Paper IDs and URLs for every source. Used by the Worker, the app, and the
// Vercel middleware.
//
//   arXiv:   1706.03762, 1706.03762v7, hep-th/9711200
//   bioRxiv: 10.1101/2021.10.04.463034, 10.1101/2021.10.04.463034v2, 10.1101/123456
//
// Paths mirror each source's own site, so swapping the domain in a link works:
//   arxiv.org/abs/1706.03762         -> talk2arxiv.org/abs/1706.03762
//   biorxiv.org/content/10.1101/...  -> talk2biorxiv.org/content/10.1101/...

export type Source = 'arxiv' | 'biorxiv'

const ARXIV_ID = /^(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?$/
const BIORXIV_ID = /^10\.1101\/(\d{4}\.\d{2}\.\d{2}\.\d{6}|\d{6})(v\d+)?$/

export function sourceOf(id: string): Source | null {
  if (ARXIV_ID.test(id)) return 'arxiv'
  if (BIORXIV_ID.test(id)) return 'biorxiv'
  return null
}

export const isPaperId = (id: string) => sourceOf(id) !== null

export const SOURCE_NAMES: Record<Source, string> = { arxiv: 'arXiv', biorxiv: 'bioRxiv' }

// The paper's page on its source site.
export function sourcePageUrl(id: string) {
  return sourceOf(id) === 'biorxiv' ? `https://www.biorxiv.org/content/${id}` : `https://arxiv.org/abs/${id}`
}

export function sourcePdfUrl(id: string) {
  return sourceOf(id) === 'biorxiv' ? `https://www.biorxiv.org/content/${id}.full.pdf` : `https://arxiv.org/pdf/${id}`
}

// The path of the paper on Talk2Arxiv / Talk2bioRxiv.
export function readerPath(id: string) {
  return sourceOf(id) === 'biorxiv' ? `/content/${id}` : `/abs/${id}`
}

export function displayId(id: string) {
  return sourceOf(id) === 'biorxiv' ? `doi:${id}` : `arXiv:${id}`
}

// Finds a paper ID in a path on this site, e.g. /pdf/1706.03762v7.pdf or
// /content/10.1101/2021.10.04.463034v2.full.pdf. Returns null for other paths.
export function paperIdFromPath(pathname: string): string | null {
  let path: string
  try {
    path = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const arxiv = path.match(/^\/(?:abs|pdf|html)\/(.+?)(?:\.pdf)?\/?$/)
  if (arxiv) return arxiv[1]

  // bioRxiv article pages: /content/10.1101/<suffix><version><.full|.full.pdf|.abstract|...>
  const biorxiv = path.match(/^\/content\/(10\.1101\/(?:\d{4}\.\d{2}\.\d{2}\.\d{6}|\d{6}))(v\d+)?(?:[.+][\w.+-]*)?\/?$/)
  if (biorxiv) return biorxiv[1] + (biorxiv[2] ?? '')

  // bioRxiv direct PDF links: /content/biorxiv/early/2022/03/10/2021.10.04.463034.full.pdf
  const early = path.match(/^\/content\/biorxiv\/early\/\d{4}\/\d{2}\/\d{2}\/(\d{4}\.\d{2}\.\d{2}\.\d{6}|\d{6})(v\d+)?\./)
  if (early) return `10.1101/${early[1]}${early[2] ?? ''}`

  return null
}

// Finds a paper ID in whatever the reader pasted: an ID, a DOI, or a link to
// arXiv, bioRxiv, or this site.
export function parsePaperInput(input: string): string | null {
  const text = input.trim()
  try {
    const fromPath = paperIdFromPath(new URL(text).pathname)
    if (fromPath && isPaperId(fromPath)) return fromPath
  } catch {
    // Not a URL. Look for a bare ID below.
  }
  const doi = text.match(/10\.1101\/(?:\d{4}\.\d{2}\.\d{2}\.\d{6}|\d{6})(?:v\d+)?/)
  if (doi) return doi[0]
  const arxiv = text.match(/(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?/)
  return arxiv ? arxiv[1] + (arxiv[2] ?? '') : null
}
