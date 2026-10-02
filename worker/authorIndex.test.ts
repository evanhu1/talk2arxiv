import { afterEach, describe, expect, it, vi } from 'vitest'
import { authorIndexPrompt, combineWorks, fetchAuthorIndex, getAuthorIndex, readAbstract, resolveAuthors, type IndexWork } from './authorIndex'
import type { LoadedPaper } from './paper'

const paper: LoadedPaper = { id: '1706.03762', source: 'arxiv', title: 'Seed paper', format: 'html', html: '', text: 'Full paper', sourceUrl: '' }
const authors = new Map([['A1', 'Alice'], ['A2', 'Bob']])
const byline = (id: string, name: string) => ({ author: { id: `https://openalex.org/${id}`, display_name: name } })
const work = (i: number): IndexWork => ({ id: `https://openalex.org/W${i}`, title: `Paper ${i}`, cited_by_count: i, authorships: [byline('A1', 'Alice'), byline('A2', 'Bob')] })
const seed: IndexWork = { ...work(0), title: paper.title, doi: 'https://doi.org/10.48550/arXiv.1706.03762' }
const meta = { id: paper.id, title: paper.title, authors: ['Alice', 'Bob'], abstract: '' }
const page = (results: IndexWork[], cursor: string | null = null) => Response.json({ results, meta: { next_cursor: cursor } })
afterEach(() => vi.unstubAllGlobals())

describe('combined author index', () => {
  it('merges shared works and bridged versions before ranking, excludes every seed version, preserves both authors', () => {
    const a = { ...work(1), title: 'Original title', doi: 'https://doi.org/10.1/a', authorships: [byline('A1', 'Alice')] }
    const b = { ...work(2), title: 'Published title', authorships: [byline('A2', 'Bob')] }
    const bridge = { ...work(3), title: b.title, doi: a.doi }
    const result = combineWorks([a, b, bridge, a, seed, { ...work(4), title: 'Seed renamed', doi: seed.doi }], seed, paper, authors)
    expect(result).toHaveLength(1)
    expect(result[0].authors).toEqual(['Alice', 'Bob'])
    expect(result[0].citations).toBe(3)
    expect(result[0].ids).toHaveLength(3)
  })

  it('resolves raw bylines but rejects ambiguous identities', () => {
    const source = { ...seed, authorships: [{ ...byline('A1', 'Alice Smith'), raw_author_name: 'Alice' }, byline('A2', 'Bob'), byline('A3', 'Bob')] }
    const resolved = resolveAuthors(source, meta.authors)
    expect([...resolved.authors]).toEqual([['A1', 'Alice']])
    expect(resolved.unresolved).toEqual(['Bob'])
  })

  it('matches reversed names and missing middle initials on the seed, tolerating null provider IDs', () => {
    const source = { ...seed, authorships: [byline('A1', 'Goodfellow, Ian'), { author: { id: null, display_name: 'Mehdi Mirza' } }, byline('A2', 'Aaron C. Courville')] }
    const result = resolveAuthors(source, ['Ian J. Goodfellow', 'Mehdi Mirza', 'Aaron Courville'])
    expect([...result.authors.values()]).toEqual(['Ian J. Goodfellow', 'Aaron Courville'])
    expect(result.unresolved).toEqual(['Mehdi Mirza'])
    expect(combineWorks([{ ...work(1), authorships: [...work(1).authorships!, { author: { id: null, display_name: 'Someone' } }] }], seed, paper, authors)).toHaveLength(1)
  })

  it('fetches all authors with OR, paginates, caps globally at 100, and fetches only top-ten abstracts', async () => {
    const calls: URL[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: URL) => {
      const url = new URL(input); calls.push(url)
      if (url.pathname.includes('/https://doi.org/')) return Response.json(seed)
      if (url.searchParams.get('select') === 'id,abstract_inverted_index') {
        const ids = url.searchParams.get('filter')!.split(':')[1].split('|')
        expect(ids).toHaveLength(10)
        expect(ids).toContain('W112')
        expect(ids).not.toContain('W102')
        return page(ids.filter((id) => id !== 'W112').map((id) => ({ id: `https://openalex.org/${id}`, title: '', abstract_inverted_index: { Abstract: [0], [id]: [1] } })))
      }
      expect(url.searchParams.get('filter')).toBe('authorships.author.id:A1|A2')
      return url.searchParams.get('cursor') === '*' ? page([seed, ...Array.from({ length: 100 }, (_, i) => work(i + 1))], 'next') : page(Array.from({ length: 12 }, (_, i) => work(i + 101)))
    }))
    const result = await fetchAuthorIndex(paper, meta)
    expect(result.status).toBe('ready')
    expect(result.papers).toHaveLength(100)
    expect(result.omittedPapers).toBe(12)
    expect(result.papers[0].title).toBe('Paper 112')
    expect(result.papers[99].title).toBe('Paper 13')
    expect(result.papers.filter((p) => p.abstract)).toHaveLength(9)
    expect(result.papers.slice(10).every((p) => !Object.hasOwn(p, 'abstract'))).toBe(true)
    expect(authorIndexPrompt(result)).toContain('+ 12 more\n</author_papers>')
    expect(calls).toHaveLength(4)
  })

  it('keeps a partial bibliography after a failed page, without claiming complete coverage', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      if (url.pathname.includes('/https://doi.org/')) return Response.json(seed)
      if (url.searchParams.get('cursor') === '*') return page([work(1)], 'next')
      return new Response('Rate limited', { status: 429 })
    }))
    const result = await fetchAuthorIndex(paper, meta)
    expect(result.status).toBe('partial')
    expect(result.papers).toHaveLength(1)
    expect(authorIndexPrompt(result)).toContain('only successfully retrieved records')
  })

  it('skips ambiguous title-search identities and degrades gracefully when the provider is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => url.pathname.includes('/https://doi.org/') ? new Response('', { status: 404 }) : page([seed, { ...seed, id: 'https://openalex.org/W999', authorships: [byline('A9', 'Alice'), byline('A2', 'Bob')] }])))
    const ambiguous = await fetchAuthorIndex(paper, meta)
    expect(ambiguous.authors).toEqual(['Bob'])
    expect(ambiguous.unresolvedAuthors).toEqual(['Alice'])
    expect(ambiguous.status).toBe('partial')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect((await fetchAuthorIndex(paper, meta)).papers).toEqual([])
  })

  it('rejects malformed abstracts and bounds large ones', () => {
    expect(readAbstract({ a: [0], b: [0] })).toBeUndefined()
    expect(readAbstract({ a: [1] })).toBeUndefined()
    expect(readAbstract({ a: [-1] })).toBeUndefined()
    expect(readAbstract({ Hello: [0], world: [1] })).toBe('Hello world')
    expect(readAbstract({ ['x'.repeat(13000)]: [0] })).toHaveLength(12021)
  })

  it('reuses the cached combined index without provider requests', async () => {
    const index = { status: 'ready', authors: ['Alice'], unresolvedAuthors: [], papers: [], omittedPapers: 0 }
    vi.stubGlobal('caches', { default: { match: vi.fn(async () => Response.json(index)) } })
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect(await getAuthorIndex(paper, { waitUntil: vi.fn() })).toEqual(index)
    expect(fetch).not.toHaveBeenCalled()
  })
})
