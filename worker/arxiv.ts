import { extractTitle, NoHtmlError, processArticle, type LoadedPaper } from './paper'

// arXiv renders most papers since 2023 (and many older ones) as HTML5.
// ar5iv covers older papers that arXiv has not rendered.
const SOURCES = [
  (id: string) => `https://arxiv.org/html/${id}`,
  (id: string) => `https://ar5iv.labs.arxiv.org/html/${id}`,
]

export const USER_AGENT = 'Talk2Arxiv/2.0 (+https://talk2arxiv.org)'

// Pages shorter than this are error or placeholder pages, not papers.
const MIN_TEXT_LENGTH = 1500

export async function fetchArxivPaper(id: string): Promise<LoadedPaper> {
  for (const source of SOURCES) {
    const paper = await fetchFrom(id, source(id))
    if (paper) return paper
  }
  throw new NoHtmlError('arXiv has no HTML version of this paper.')
}

async function fetchFrom(id: string, url: string): Promise<LoadedPaper | null> {
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

  return {
    id,
    source: 'arxiv',
    format: 'html',
    title: extractTitle(page, text),
    sourceUrl: response.url || url,
    html,
    text,
  }
}
