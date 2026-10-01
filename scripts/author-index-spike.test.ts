import assert from 'node:assert/strict'
import test from 'node:test'
import { abstractText, compatibleName, normalize, parseArxiv, sameWork, selectAuthor } from './author-index-spike.ts'

test('reconstructs repeated words in their original order', () => {
  assert.equal(abstractText({ one: [0, 2], two: [1] }), 'one two one')
  assert.equal(abstractText(null), null)
  assert.equal(abstractText({}), null)
})

test('rejects malformed abstracts instead of silently presenting corrupted text', () => {
  assert.throws(() => abstractText({ missing: [1] }), /Incomplete/)
  assert.throws(() => abstractText({ first: [0], second: [0] }), /Overlapping/)
  assert.throws(() => abstractText({ invalid: [-1] }), /Invalid/)
})

test('matches diacritics but does not infer identities from surnames', () => {
  assert.equal(normalize('Łukasz Kaiser'), normalize('Lukasz Kaiser'))
  assert.notEqual(normalize('Heng Li'), normalize('Hong Li'))
  assert.notEqual(normalize('Richard Neher'), normalize('Richard A. Neher'))
})

test('requires exactly one author identity on the seed paper', () => {
  const allowed = new Set([normalize('Heng Li')])
  assert.equal(selectAuthor([{ id: 'a', name: 'Heng Li' }], allowed).id, 'a')
  assert.throws(() => selectAuthor([{ id: 'b', name: 'Hong Li' }], allowed), /found 0/)
  assert.throws(() => selectAuthor([{ id: 'a', name: 'Heng Li' }, { id: 'b', name: 'Heng Li' }], allowed), /found 2/)
})

test('uses the original byline when the indexed author has a different display name', () => {
  assert.equal(selectAuthor([{ id: 'niki', name: 'Niki Jitendra Parmar', aliases: ['Niki Parmar'] }], new Set([normalize('Niki Parmar')])).id, 'niki')
})

test('recognizes initials on a known seed without conflating different spelled-out first names', () => {
  assert.equal(compatibleName('T. Tao', 'Terence Tao'), true)
  assert.equal(compatibleName('Neher, R. A.', 'Richard A. Neher'), true)
  assert.equal(compatibleName('Niki Jitendra Parmar', 'Niki Parmar'), true)
  assert.equal(compatibleName('Hong Li', 'Heng Li'), false)
  assert.equal(compatibleName('Richard B. Neher', 'Richard A. Neher'), false)
})

test('reads legacy arXiv identifiers, versions, entities, authors and abstracts', () => {
  const [paper] = parseArxiv(`<feed><entry><id>http://arxiv.org/abs/math/0404188v2</id>
    <title>Primes &amp; progressions</title><summary>First\n second &lt; third.</summary>
    <published>2004-04-08T00:00:00Z</published><author><name>Terence Tao</name></author>
    <arxiv:doi>10.1000/TEST</arxiv:doi></entry></feed>`)
  assert.equal(paper.arxiv, 'math/0404188')
  assert.equal(paper.title, 'Primes & progressions')
  assert.equal(paper.abstract, 'First second < third.')
  assert.equal(paper.doi, '10.1000/test')
  assert.deepEqual(paper.authors, [{ id: '', name: 'Terence Tao' }])
  assert.equal(paper.year, 2004)
})

test('treats arXiv errors and non-XML responses as failures, not empty bibliographies', () => {
  assert.throws(() => parseArxiv('upstream unavailable'), /Atom/)
  assert.throws(() => parseArxiv('<feed><entry><title>Error</title><summary>bad id</summary></entry></feed>'), /bad id/)
})

test('matches renamed papers by identifier and punctuation variants by exact normalized title', () => {
  const base = { id: '1', title: 'A: Paper!', abstract: null, url: null, year: null, doi: null, arxiv: '1234.56789', authors: [] }
  assert.equal(sameWork(base, { ...base, title: 'Renamed paper' }), true)
  assert.equal(sameWork(base, { ...base, arxiv: null, title: 'A paper' }), true)
  assert.equal(sameWork(base, { ...base, arxiv: null, title: 'Unrelated paper' }), false)
  assert.equal(sameWork({ ...base, title: '', arxiv: null }, { ...base, title: '', arxiv: null }), false)
})
