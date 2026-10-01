import type { Citation } from '../shared/types'
import { hasMatchingAuthor, paperIdFromReference, sameTitle, validReferenceId } from '../shared/citations'
import { sourcePageUrl } from '../shared/papers'
import { USER_AGENT } from './arxiv'
import { getPaperMeta, tagText } from './meta'
import { decodeEntities, getPaper, PaperError } from './paper'

const clean = (text: string) => decodeEntities(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

// Resolve against the original bibliography, never client-supplied paper text or URLs.
export async function getCitation(paperId: string, referenceId: string, ctx: ExecutionContext): Promise<Citation> {
  if (!validReferenceId(referenceId)) throw new PaperError('Invalid citation.', 400)
  const key = new Request(`https://cache.talk2arxiv.internal/citation/v3/${paperId}/${referenceId}`)
  const cached = await caches.default.match(key)
  if (cached) return cached.json()
  const paper = await getPaper(paperId, ctx)
  const { links, ...reference } = await extractReference(paper.html, referenceId)
  let citation: Citation = { ...reference, referenceId, abstract: '', url: links.find((link) => /^https?:\/\//.test(link)) }
  const id = paperIdFromReference(reference.referenceText, links)
  if (id) {
    citation = { ...citation, paperId: id, url: sourcePageUrl(id) }
    const meta = await getPaperMeta(id, ctx).catch(() => null)
    if (meta) citation = { ...citation, title: meta.title, authors: meta.authors, abstract: meta.abstract }
  } else {
    const doi = [...links, reference.referenceText].join(' ').match(/10\.\d{4,9}\/[^\s<>"?#]+/)?.[0].replace(/[.,;]+$/, '')
    const [work, preprint] = await Promise.all([
      crossref(doi, reference.title, reference.referenceText).catch(() => null),
      findArxiv(reference.title, reference.referenceText).catch(() => null),
    ])
    if (work) citation = { ...citation, ...work }
    if (preprint) citation = { ...citation, ...preprint }
  }
  // Don't retain provider failures for days. Successful lookups are stable metadata.
  const ttl = citation.abstract ? 604800 : 300
  ctx.waitUntil(caches.default.put(key, Response.json(citation, { headers: { 'Cache-Control': `public, max-age=${ttl}` } })))
  return citation
}

export async function extractReference(html: string, referenceId: string) {
  if (!validReferenceId(referenceId)) throw new PaperError('Invalid citation.', 400)
  let active = false
  let found = false
  let text = ''
  let title = ''
  let titleActive = false
  let block: string | null = null
  const blocks: string[] = []
  const links: string[] = []
  await new HTMLRewriter()
    .on(`[id="${referenceId}"]`, {
      element(el) {
        const classes = el.getAttribute('class') ?? ''
        if (!/ltx_bibitem|\bcit\b/.test(classes) && !referenceId.startsWith('ref-')) return
        found = active = true
        el.onEndTag(() => { active = false })
      },
      text(chunk) {
        if (active) text += chunk.text
      },
    })
    .on('.ltx_bibblock', {
      element(el) {
        if (!active) return
        block = ''
        el.onEndTag(() => { blocks.push(clean(block ?? '')); block = null })
      },
      text(chunk) { if (active && block !== null) block += chunk.text },
    })
    .on('.cit-article-title, .ltx_bib_title', {
      element(el) {
        if (!active) return
        titleActive = true
        el.onEndTag(() => { titleActive = false })
      },
      text(chunk) { if (titleActive) title += chunk.text },
    })
    .on('a[href]', {
      element(el) {
        if (active) links.push(decodeEntities(el.getAttribute('href') ?? ''))
      },
    })
    .on('[data-doi]', {
      element(el) {
        if (active) links.push(`https://doi.org/${decodeEntities(el.getAttribute('data-doi') ?? '')}`)
      },
    })
    .transform(new Response(html)).text()
  if (!found || !text.trim()) throw new PaperError('This reference could not be found in the paper.', 404)
  return {
    referenceText: clean(text).slice(0, 12000),
    title: clean(title || blocks[1] || text).replace(/\.$/, '').slice(0, 1000),
    authors: blocks.length > 1 ? [blocks[0]] : [],
    links,
  }
}

async function crossref(doi: string | undefined, title: string, referenceText: string): Promise<Partial<Citation> | null> {
  const query = new URLSearchParams({ 'query.bibliographic': referenceText, rows: '3' })
  const response = await fetch(doi ? `https://api.crossref.org/works/${encodeURIComponent(doi)}` : `https://api.crossref.org/works?${query}`, {
    headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) return null
  interface Work { DOI?: string; title?: string[]; abstract?: string; author?: { given?: string; family?: string; name?: string }[] }
  const { message } = await response.json() as { message: Work & { items?: Work[] } }
  const work = doi ? message : message.items?.find((item) =>
    sameTitle(clean(item.title?.[0] ?? ''), title) &&
    hasMatchingAuthor((item.author ?? []).map((author) => author.family ?? author.name ?? ''), referenceText),
  )
  if (!work?.title?.[0] || !work.DOI) return null
  const url = `https://doi.org/${work.DOI}`
  const paperId = paperIdFromReference('', [url])
  return {
    title: clean(work.title[0]),
    authors: (work.author ?? []).map((author) => author.name ?? [author.given, author.family].filter(Boolean).join(' ')),
    abstract: clean(work.abstract ?? '').replace(/^Abstract\s*/i, ''),
    url,
    ...(paperId ? { paperId } : {}),
  }
}

async function findArxiv(title: string, referenceText: string): Promise<Partial<Citation> | null> {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter((word) => word.length > 2).slice(0, 12)
  if (words.length < 2) return null
  const query = new URLSearchParams({ search_query: words.map((word) => `ti:${word}`).join(' AND '), max_results: '3' })
  const response = await fetch(`https://export.arxiv.org/api/query?${query}`, {
    headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) return null
  for (const [, entry] of (await response.text()).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const name = tagText(entry, 'title') ?? ''
    const authors = [...entry.matchAll(/<author>\s*<name>([^<]*)<\/name>/g)].map((match) => clean(match[1]))
    if (!sameTitle(name, title) || !hasMatchingAuthor(authors, referenceText)) continue
    const id = paperIdFromReference('', [tagText(entry, 'id') ?? ''])
    if (!id) continue
    return {
      title: name, paperId: id, url: sourcePageUrl(id), abstract: tagText(entry, 'summary') ?? '',
      authors,
    }
  }
  return null
}
