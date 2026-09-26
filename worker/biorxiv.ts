import { decodeEntities, PaperError, processArticle, type LoadedPaper } from './paper'

// bioRxiv's own full-text page, e.g.
// https://www.biorxiv.org/content/10.1101/2021.10.04.463034v2.full
// Without a version in the ID, bioRxiv redirects to the latest version.
//
// bioRxiv blocks most server traffic but allows requests from Cloudflare's
// network, so this only works from the deployed Worker (or `wrangler dev
// --remote`), not from the local dev server.
const CONTENT_URL = 'https://www.biorxiv.org/content/'
const USER_AGENT =
  'Mozilla/5.0 (compatible; Talk2bioRxiv/2.0; +https://talk2biorxiv.org) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

export async function fetchBiorxivPage(path: string): Promise<{ page: string; url: string }> {
  let response: Response
  try {
    response = await fetch(CONTENT_URL + path, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', 'Accept-Language': 'en' },
    })
  } catch {
    throw new PaperError('bioRxiv is not responding. Try again soon.', 502)
  }
  // bioRxiv answers unknown DOIs with 403 or 404.
  if (response.status === 403 || response.status === 404) {
    throw new PaperError('bioRxiv has no paper with this DOI.', 404)
  }
  // bioRxiv limits bursts of requests, even from Cloudflare. It clears in about a minute.
  if (response.status === 429) throw new PaperError('bioRxiv is busy right now. Try again in a minute.', 503)
  if (!response.ok) throw new PaperError(`bioRxiv returned an error (${response.status}). Try again soon.`, 502)
  return { page: await response.text(), url: response.url }
}

export async function fetchBiorxivPaper(id: string): Promise<LoadedPaper> {
  const { page, url } = await fetchBiorxivPage(`${id}.full`)
  const article = extractDiv(page, 'class="article fulltext-view')
  if (!article) {
    throw new PaperError('bioRxiv has no full text for this paper. It may only be available as a PDF.', 404)
  }

  const title = readMeta(page, 'citation_title')[0] || id
  const authors = readMeta(page, 'citation_author')
  // Figure and table images live next to the PDF:
  // .../early/2022/03/10/2021.10.04.463034.full.pdf -> .../2021.10.04.463034/T1.large.jpg
  const assetBase = readMeta(page, 'citation_pdf_url')[0]?.replace(/\.full\.pdf$/, '')

  // The page's header is outside the article, so rebuild the title and authors.
  const header =
    `<h1 class="paper-title">${escapeHtml(title)}</h1>` +
    (authors.length ? `<p class="paper-authors">${authors.map(escapeHtml).join(', ')}</p>` : '')

  const { html, text } = await processArticle(header + article, url, (rewriter, { drop }) =>
    rewriter
      // bioRxiv's own controls: download links, reference lookups, table buttons.
      .on(
        'noscript, .highwire-figure-links, .cit-ref-sprinkles, .rev-xref-ref, .table-callout-links, .highwire-journal-article-marker-start',
        { element: drop },
      )
      // Images load lazily on bioRxiv. The real URL is in data-src.
      .on('img[data-src]', {
        element(el) {
          el.setAttribute('src', el.getAttribute('data-src')!)
          el.removeAttribute('data-src')
        },
      })
      // Use the large figure image, not the small preview.
      .on('img.fragment-image', {
        element(el) {
          const src = el.getAttribute('src')
          if (src) el.setAttribute('src', src.replace(/\.medium\.gif$/, '.large.jpg'))
        },
      })
      // Tables load on demand on bioRxiv, as images. Show the image inline.
      .on('div.table[id]', {
        element(el) {
          const tableId = el.getAttribute('id') ?? ''
          if (assetBase && /^T\d+$/.test(tableId)) {
            el.prepend(`<img class="table-image" src="${assetBase}/${tableId}.large.jpg" alt="Table ${tableId.slice(1)}">`, {
              html: true,
            })
          }
        },
      }),
  )

  return { id, source: 'biorxiv', title, sourceUrl: url, html, text }
}

// Values of <meta name="..." content="..."> tags, in page order.
export function readMeta(page: string, name: string) {
  const pattern = new RegExp(`<meta name="${name}" content="([^"]*)"`, 'g')
  return [...page.matchAll(pattern)].map((match) => decodeEntities(match[1]).replace(/\s+/g, ' ').trim())
}

// The outer HTML of the <div> whose opening tag contains `marker`.
function extractDiv(page: string, marker: string): string | null {
  const markerAt = page.indexOf(marker)
  if (markerAt < 0) return null
  const start = page.lastIndexOf('<div', markerAt)
  const tags = /<(\/?)div\b[^>]*>/g
  tags.lastIndex = start
  let depth = 0
  for (let match = tags.exec(page); match; match = tags.exec(page)) {
    depth += match[1] ? -1 : 1
    if (depth === 0) return page.slice(start, match.index + match[0].length)
  }
  return null
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
