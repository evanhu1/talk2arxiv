const HIGHLIGHT_NAME = 'talk2arxiv-quote'
const MAX_QUOTE_LENGTH = 8000

// Turns a selected range into text for the model. Math becomes its LaTeX
// source, because the rendered MathML text ("h t") loses the meaning.
export function rangeToQuote(range: Range): string {
  const holder = document.createElement('div')
  holder.append(range.cloneContents())
  for (const math of holder.querySelectorAll('math')) {
    const tex = math.getAttribute('alttext')
    const display = math.getAttribute('display') === 'block'
    math.replaceWith(tex ? (display ? `$$${tex}$$` : `$${tex}$`) : (math.textContent ?? ''))
  }
  for (const hidden of holder.querySelectorAll('annotation, annotation-xml, .ltx_note_outer')) {
    hidden.remove()
  }
  return (holder.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_LENGTH)
}

const supportsHighlights = () => typeof CSS !== 'undefined' && 'highlights' in CSS

export function showQuoteHighlight(range: Range) {
  if (supportsHighlights()) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range))
}

export function clearQuoteHighlight() {
  if (supportsHighlights()) CSS.highlights.delete(HIGHLIGHT_NAME)
}
