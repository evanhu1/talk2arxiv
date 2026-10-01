import { describe, expect, it } from 'vitest'
import { hasMatchingAuthor, paperIdFromReference, sameTitle, validReferenceId } from './citations'

describe('citation matching', () => {
  it('recognizes plain-text arXiv IDs in bibliographies', () => {
    expect(paperIdFromReference('CoRR, abs/1409.0473, 2014.', [])).toBe('1409.0473')
    expect(paperIdFromReference('arXiv:hep-th/9711200v2', [])).toBe('hep-th/9711200v2')
  })
  it('recognizes source links and bioRxiv DOIs', () => {
    expect(paperIdFromReference('', ['https://arxiv.org/pdf/1706.03762v7.pdf'])).toBe('1706.03762v7')
    expect(paperIdFromReference('doi:10.1101/2021.10.04.463034', [])).toBe('10.1101/2021.10.04.463034')
    expect(paperIdFromReference('', ['https://doi.org/10.1101/791293'])).toBe('10.1101/791293')
  })
  it('does not mistake unrelated URLs or journal numbers for paper IDs', () => {
    expect(paperIdFromReference('Journal 1409.0473', ['https://example.org/abs/1706.03762'])).toBeNull()
    expect(paperIdFromReference('', ['https://arxiv.org.evil.example/abs/1706.03762'])).toBeNull()
  })
  it('accepts typography changes but rejects merely similar titles', () => {
    expect(sameTitle('Long short-term memory.', 'LONG SHORT–TERM MEMORY')).toBe(true)
    expect(sameTitle('Attention Is All You Need', 'Attention Is Not All You Need')).toBe(false)
    expect(sameTitle('', '')).toBe(false)
  })
  it('allows source reference IDs without allowing selector injection', () => {
    expect(validReferenceId('bib.bib2')).toBe(true)
    expect(validReferenceId('ref-17')).toBe(true)
    expect(validReferenceId('x"], article')).toBe(false)
    expect(validReferenceId('a'.repeat(201))).toBe(false)
  })
  it('requires author overlap for papers found by title', () => {
    expect(hasMatchingAuthor(['Jürgen Schmidhuber'], 'Hochreiter and Jurgen Schmidhuber (1997)')).toBe(true)
    expect(hasMatchingAuthor(['Yann LeCun'], 'Jane Smith. Deep learning.')).toBe(false)
    expect(hasMatchingAuthor(['Alice Li'], 'Li et al. (2020)')).toBe(true)
  })
})
