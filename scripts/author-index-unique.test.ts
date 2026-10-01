import assert from 'node:assert/strict'
import test from 'node:test'
import { buildUnique, type Work } from './author-index-unique.ts'

const authors = [{ id: 'author', name: 'Heng Li' }, { id: 'coauthor', name: 'Jane Researcher' }]
const work = (id: string, fields: Partial<Work> = {}): Work => ({ id, title: `Research paper ${id}`, abstract: null, url: `https://doi.org/10.1/${id}`, year: 2020, doi: null, arxiv: null, authors, ...fields })
const run = (oa: Work[], arxiv: Work[] = [], semantic: Work[] = []) => buildUnique({
  case: { name: 'Heng Li', seed: { title: 'Seed paper', arxiv: '1234.56789' } },
  providers: [
    { provider: 'openalex', works: oa, complete: true },
    { provider: 'arxiv-name-search', works: arxiv, complete: true },
    { provider: 'semantic-scholar', works: semantic, complete: true },
  ],
})

test('merges preprint and journal records transitively and preserves alternate titles', () => {
  const result = run([
    work('preprint', { title: 'Original long title', arxiv: '2001.12345' }),
    work('journal', { title: 'Renamed journal title', doi: '10.123/test' }),
    work('bridge', { title: 'Renamed journal title', arxiv: '2001.12345', doi: '10.123/test' }),
  ])
  assert.equal(result.papers.length, 1)
  assert.equal(result.papers[0].sources.length, 3)
  assert.equal(result.papers[0].alternateTitles.length, 1)
})

test('backfills abstracts and removes all versions of the seed', () => {
  const result = run([
    work('seed', { title: 'Seed paper', arxiv: '1234.56789' }),
    work('other', { title: 'Another paper', doi: '10.123/other' }),
  ], [work('source', { title: 'Another paper', abstract: 'Source abstract', arxiv: '2002.12345' })])
  assert.equal(result.papers.length, 1)
  assert.equal(result.papers[0].abstract, 'Source abstract')
  assert.equal(result.papers[0].abstractSource, 'arxiv')
  assert.equal(result.papers[0].url, 'https://arxiv.org/abs/2002.12345')
})

test('does not admit unrelated same-name researchers or uncorroborated Semantic Scholar records', () => {
  const result = run([work('known')], [
    work('relevant', { title: 'New research with a known coauthor' }),
    work('unrelated', { title: 'Different researcher', authors: [{ id: '', name: 'Heng Li' }, { id: '', name: 'Other Person' }] }),
  ], [work('bad-kitmus', { title: 'Incorrectly attributed paper', abstract: 'Even an abstract does not establish authorship' })])
  assert.equal(result.papers.length, 2)
  assert.equal(result.review.length, 2)
  assert.ok(result.papers.every((p) => !p.title.includes('Incorrectly') && !p.title.includes('Different researcher')))
})

test('merges tiny title typos with corroboration and excludes explicit corrections', () => {
  const result = run([
    work('image', { title: 'Image Transformer' }),
    work('typo', { title: 'Image Tranformer' }),
    work('correction', { title: 'Correction: Image Transformer' }),
    work('different', { title: 'Image Transformers', authors: [{ id: '', name: 'Heng Li' }] }),
  ])
  assert.equal(result.papers.length, 2)
  assert.equal(result.papers.find((p) => p.title === 'Image Transformer')?.sources.length, 2)
})

test('keeps the independent author website out of the constructed bibliography', () => {
  const result = buildUnique({
    case: { name: 'Heng Li', seed: { title: 'Seed paper' } },
    providers: [
      { provider: 'openalex', works: [work('found')], complete: true },
      { provider: 'author-website', works: [work('found'), work('missing')], complete: true },
    ],
  })
  assert.equal(result.papers.length, 1)
  assert.equal(result.metrics.independentWebsiteCoverage?.matched, 1)
  assert.equal(result.metrics.independentWebsiteCoverage?.total, 2)
})
