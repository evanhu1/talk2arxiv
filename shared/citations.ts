import { isPaperId, paperIdFromPath } from './papers'

export const validReferenceId = (id: unknown): id is string =>
  typeof id === 'string' && /^[\w.:-]{1,200}$/.test(id)

export function paperIdFromReference(text: string, links: string[]): string | null {
  for (const link of links) {
    try {
      const url = new URL(link)
      if (!/(^|\.)(arxiv\.org|biorxiv\.org)$/.test(url.hostname)) continue
      const id = paperIdFromPath(url.pathname)
      if (id && isPaperId(id)) return id
    } catch { /* Not an absolute paper link. */ }
  }
  // Require an arXiv marker: bare numbers may be a journal volume or a DOI.
  const arxiv = text.match(/(?:arxiv\s*:\s*|\babs\/)(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?)/i)
  if (arxiv && isPaperId(arxiv[1])) return arxiv[1]
  const doi = [text, ...links].join(' ').match(/10\.(?:1101|64898)\/(?:\d{4}\.\d{2}\.\d{2}\.\d{6}|\d{6})(?:v\d+)?/)
  return doi?.[0] ?? null
}

// Prefer no match to silently attaching another paper with a similar title.
export function sameTitle(a: string, b: string) {
  const normalize = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const title = normalize(a)
  return title.length >= 12 && title === normalize(b)
}

export function hasMatchingAuthor(names: string[], referenceText: string) {
  const words = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  const referenceWords = new Set(words(referenceText))
  return names.some((name) => {
    const surname = words(name).at(-1)
    return surname !== undefined && surname.length > 1 && referenceWords.has(surname)
  })
}
