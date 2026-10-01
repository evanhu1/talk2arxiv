import assert from 'node:assert/strict'
import test from 'node:test'
import { compactContext, rankPapers, renderContext } from './author-index-context.ts'

const paper = (id: number) => ({
  title: `Paper ${id}`, abstract: `Abstract ${id}`, url: `https://example.org/${id}`, year: 2020,
  abstractSource: 'openalex', alternateTitles: [],
  sources: [{ id: `W${id}`, provider: 'openalex', doi: null, arxiv: null }],
})

test('sorts by citation count and completely omits abstracts after rank ten', () => {
  const papers = Array.from({ length: 12 }, (_, i) => paper(i))
  const counts = Object.fromEntries(papers.map((_, i) => [`W${i}`, i]))
  const result = compactContext(papers, counts)
  assert.equal(result.length, 12)
  assert.equal(result[0].title, 'Paper 11')
  assert.equal(result[9].abstract, 'Abstract 2')
  assert.ok(result.slice(10).every((p) => !Object.hasOwn(p, 'abstract')))
  assert.ok(!renderContext('Author', result).includes('Abstract 0'))
  assert.ok(!Object.hasOwn(result[0], 'sources'))
})

test('does not fill an unavailable top-ten abstract with a lower-ranked paper', () => {
  const papers = Array.from({ length: 11 }, (_, i) => ({ ...paper(i), abstract: i === 10 ? null : `Abstract ${i}` }))
  const result = compactContext(papers, Object.fromEntries(papers.map((_, i) => [`W${i}`, i])))
  assert.equal(result.filter((p) => p.abstract).length, 9)
  assert.ok(!Object.hasOwn(result[10], 'abstract'))
})

test('uses the maximum count across versions, not their sum', () => {
  const merged = { ...paper(1), sources: [...paper(1).sources, ...paper(2).sources] }
  assert.equal(rankPapers([merged], { W1: 100, W2: 120 })[0].citations, 120)
})

test('ranks unknown counts after zero and breaks citation ties deterministically', () => {
  const result = rankPapers([{ ...paper(1), year: 2022 }, paper(2), { ...paper(3), year: 2025 }], { W1: 0, W2: 0 })
  assert.deepEqual(result.map((p) => p.title), ['Paper 1', 'Paper 2', 'Paper 3'])
  assert.equal(result[2].citations, null)
})

test('caps after ranking at 100 and reports omitted papers at the bottom', () => {
  const papers = Array.from({ length: 112 }, (_, i) => paper(i))
  const result = compactContext(papers, Object.fromEntries(papers.map((_, i) => [`W${i}`, i])))
  assert.equal(result.length, 100)
  assert.equal(result[0].title, 'Paper 111')
  assert.equal(result[99].title, 'Paper 12')
  assert.equal(result.filter((p) => p.abstract).length, 10)
  assert.ok(renderContext('Author', result, papers.length - result.length).endsWith('\n\n+ 12 more\n'))
  assert.ok(!renderContext('Author', result, 0).includes(' more'))
})
