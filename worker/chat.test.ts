import { afterEach, describe, expect, it, vi } from 'vitest'
import { citationPrompt, streamAnswer, validateChatRequest } from './chat'
import type { Citation } from '../shared/types'
import type { LoadedPaper } from './paper'

const citation: Citation = {
  referenceId: 'bib.bib2', title: 'Cited research', referenceText: 'Reference entry',
  abstract: 'Available abstract.', authors: ['Author'], url: 'https://arxiv.org/abs/1409.0473',
}
const paper: LoadedPaper = {
  id: '1706.03762', source: 'arxiv', format: 'html', title: 'Original paper',
  sourceUrl: 'https://arxiv.org/html/1706.03762', html: '', text: 'Original full text.',
}

afterEach(() => vi.unstubAllGlobals())

describe('cited paper context', () => {
  it('marks abstract-only context explicitly', () => {
    const prompt = citationPrompt({ citation })
    expect(prompt).toContain('Only the abstract')
    expect(prompt).toContain(citation.abstract)
    expect(prompt).not.toContain('Full text of the cited paper:')
  })
  it('keeps the original and cited full texts distinct', async () => {
    const request = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response('data: [DONE]\n'))
    vi.stubGlobal('fetch', request)
    await streamAnswer('test-key', paper, [{ role: 'user', content: 'Compare them.', citation }], null, {
      citation, paper: { ...paper, id: '1409.0473', text: 'Cited full text.' },
    })
    const body = JSON.parse(request.mock.calls[0][1]!.body as string)
    expect(body.messages[0].content).toContain('Original full text.')
    expect(body.messages[1].content).toContain('Cited full text.')
    expect(body.messages[1].content).toContain(citation.url)
    expect(body.messages[2].content).toContain('bib.bib2')
  })
  it('attaches both PDFs using distinct filenames', async () => {
    const request = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response('data: [DONE]\n'))
    vi.stubGlobal('fetch', request)
    await streamAnswer('test-key', { ...paper, format: 'pdf' }, [{ role: 'user', content: 'Compare.' }], 'https://example.org/original.pdf', {
      citation, pdf: 'https://example.org/cited.pdf',
    })
    const body = JSON.parse(request.mock.calls[0][1]!.body as string)
    const files = body.messages.at(-1).content.filter((part: { type: string }) => part.type === 'file')
    expect(files.map((part: { file: { filename: string } }) => part.file.filename).sort()).toEqual(['cited-paper.pdf', 'paper.pdf'])
  })
  it('rejects malformed messages and citation metadata before loading sources', () => {
    expect(validateChatRequest({ paperId: paper.id, messages: [null] })).toBe('Invalid message.')
    expect(validateChatRequest({ paperId: paper.id, messages: [{ role: 'user', content: '?', citation: { referenceId: 'x"]', title: 'Bad' } }] })).toBe('Invalid citation.')
    expect(validateChatRequest({ paperId: paper.id, messages: [{ role: 'user', content: '?', citation }] })).toBeNull()
  })
})
