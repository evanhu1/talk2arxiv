export interface CitationHit {
  referenceId: string
  title: string
  referenceText: string
  anchor: HTMLAnchorElement
}

export function citationAtLink(anchor: HTMLAnchorElement, root: HTMLElement): CitationHit | null {
  let id: string
  try { id = decodeURIComponent(new URL(anchor.href).hash.slice(1)) } catch { return null }
  if (!id) return null
  let reference = root.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
  // HighWire sometimes puts ref-N on a reverse-link control that is stripped
  // from the reader. Its bibliography still has a stable cit-* ID and label.
  if (/^ref-\d+$/.test(id)) {
    const item = reference?.closest('li') ?? [...root.querySelectorAll('.ref-list li')].find((item) =>
      item.querySelector('.ref-label')?.textContent?.replace(/\D/g, '') === id.slice(4),
    )
    reference = item?.querySelector<HTMLElement>('.cit[id]') ?? reference
  }
  if (!reference || !reference.matches('.ltx_bibitem, .cit, [id^="ref-"]')) return null
  // Links inside the bibliography still open their external sources normally.
  if (reference.contains(anchor)) return null
  const blocks = reference.querySelectorAll('.ltx_bibblock')
  const title = reference.querySelector('.cit-article-title, .ltx_bib_title')?.textContent || blocks[1]?.textContent
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim()
  return { referenceId: reference.id, title: clean(title || 'Cited paper'), referenceText: clean(reference.textContent ?? ''), anchor }
}
