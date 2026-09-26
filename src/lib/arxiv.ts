const ID_PATTERN = /(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?/

// Paths mirror arxiv.org, so swapping the domain in any paper link works:
// /abs/1706.03762, /pdf/1706.03762.pdf, /html/1706.03762v7
export function paperIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/(?:abs|pdf|html)\/(.+?)(?:\.pdf)?\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

// Finds an arXiv ID in a pasted link or ID.
export function parseArxivInput(input: string): string | null {
  const match = input.trim().match(ID_PATTERN)
  return match ? match[1] + (match[2] ?? '') : null
}

export const absUrl = (id: string) => `https://arxiv.org/abs/${id}`
export const pdfUrl = (id: string) => `https://arxiv.org/pdf/${id}`
