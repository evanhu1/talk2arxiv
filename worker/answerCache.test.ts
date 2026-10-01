import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STREAM_ERROR_MARKER, type ChatMessage } from '../shared/types'
import type { LoadedPaper } from './paper'
import { streamAnswer, type CitationContext, validateChatRequest } from './chat'
import { answerCacheKey, replayAnswer } from './answerCache'

const paper: LoadedPaper = {
  id: '1706.03762', source: 'arxiv', format: 'html', title: 'A paper',
  sourceUrl: 'https://arxiv.org/html/1706.03762', html: '', text: 'Full original paper text.',
}
const question: ChatMessage[] = [{ role: 'user', content: 'Summarize this paper in a few bullet points.' }]
const answer = 'A complete answer about the paper, with equations $x = 2$ and Unicode 🧬. '.repeat(3)
const event = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`
const successful = (text = answer) => event({ choices: [{ delta: { content: text }, finish_reason: null }] }) +
  event({ choices: [{ delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n'

let entries: Map<string, Response>
let writes: Promise<unknown>[]
let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }
const ctx = { waitUntil: (promise: Promise<unknown>) => { writes.push(promise) } }
const options = { ctx }

beforeEach(() => {
  entries = new Map()
  writes = []
  cache = {
    match: vi.fn(async (key: Request) => entries.get(key.url)?.clone()),
    put: vi.fn(async (key: Request, response: Response) => { entries.set(key.url, response.clone()) }),
  }
  vi.stubGlobal('caches', { default: cache })
})
afterEach(() => vi.unstubAllGlobals())

async function consume(response: Response) {
  const text = await response.text()
  await Promise.all(writes)
  return text
}

describe('completed answer cache', () => {
  it('reuses preset answers across readers and replays multiple chunks without calling the model', async () => {
    const upstream = vi.fn(async () => new Response(successful()))
    vi.stubGlobal('fetch', upstream)
    const first = await streamAnswer('key-one', paper, question, null, undefined, options)
    expect(first.headers.get('X-Answer-Cache')).toBe('MISS')
    expect(await consume(first)).toBe(answer)
    const stored = [...entries.values()][0]
    expect(stored.headers.get('Cache-Control')).toBe('public, max-age=604800')

    const second = await streamAnswer('key-two', paper, question, null, undefined, options)
    expect(second.headers.get('X-Answer-Cache')).toBe('HIT')
    expect(second.headers.get('Cache-Control')).toBe('no-store')
    const chunks: string[] = []
    const reader = second.body!.pipeThrough(new TextDecoderStream()).getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBe(answer)
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('isolates papers, changed full text, questions, quotes, history, and cited context', async () => {
    const upstream = vi.fn(async () => new Response(successful()))
    vi.stubGlobal('fetch', upstream)
    await consume(await streamAnswer('key', paper, question, null, undefined, options))
    const cited: CitationContext = { citation: {
      referenceId: 'bib.bib2', title: 'Other paper', referenceText: 'Reference', authors: [], abstract: 'Cited abstract.',
    } }
    const variants: [LoadedPaper, ChatMessage[], CitationContext?][] = [
      [{ ...paper, id: '1706.03762v2' }, question],
      [{ ...paper, text: 'Updated full text.' }, question],
      [paper, [{ role: 'user', content: 'Explain the method.' }]],
      [paper, [{ ...question[0], quote: 'A highlighted passage.' }]],
      [paper, [{ role: 'user', content: 'Previous question.' }, { role: 'assistant', content: 'Previous answer.' }, ...question]],
      [paper, question, cited],
      [paper, question, { ...cited, citation: { ...cited.citation, abstract: 'Updated cited abstract.' } }],
    ]
    for (const [source, messages, citation] of variants) {
      const response = await streamAnswer('key', source, messages, null, citation, options)
      expect(response.headers.get('X-Answer-Cache')).toBe('MISS')
      await consume(response)
    }
    expect(entries.size).toBe(variants.length + 1)
  })

  it('regenerates freshly and replaces the cached answer after success', async () => {
    const upstream = vi.fn().mockImplementationOnce(async () => new Response(successful('First answer.')))
      .mockImplementationOnce(async () => new Response(successful('New answer.')))
    vi.stubGlobal('fetch', upstream)
    await consume(await streamAnswer('key', paper, question, null, undefined, options))
    const fresh = await streamAnswer('key', paper, question, null, undefined, { ctx, regenerate: true })
    expect(fresh.headers.get('X-Answer-Cache')).toBe('BYPASS')
    expect(await consume(fresh)).toBe('New answer.')
    const reused = await streamAnswer('key', paper, question, null, undefined, options)
    expect(await reused.text()).toBe('New answer.')
    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['truncated', event({ choices: [{ delta: { content: 'Partial' }, finish_reason: null }] })],
    ['token limit', event({ choices: [{ delta: { content: 'Partial' }, finish_reason: 'length' }] }) + 'data: [DONE]\n'],
    ['filtered', event({ choices: [{ delta: {}, finish_reason: 'content_filter' }] }) + 'data: [DONE]\n'],
    ['malformed', 'data: {bad json}\n' + successful()],
    ['missing stop', event({ choices: [{ delta: { content: 'Partial' } }] }) + 'data: [DONE]\n'],
  ])('does not cache a %s stream', async (_name, stream) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream)))
    const response = await streamAnswer('key', paper, question, null, undefined, options)
    expect(await consume(response)).toContain(STREAM_ERROR_MARKER)
    expect(entries.size).toBe(0)
  })

  it('does not cache empty answers or upstream HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(successful(''))))
    await consume(await streamAnswer('key', paper, question, null, undefined, options))
    expect(entries.size).toBe(0)
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'Busy' } }, { status: 429 })))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failed = await streamAnswer('key', paper, question, null, undefined, options)
    expect(failed.status).toBe(502)
    expect(entries.size).toBe(0)
    spy.mockRestore()
  })

  it('continues answering when cache reads or writes fail', async () => {
    cache.match.mockRejectedValue(new Error('Cache unavailable'))
    cache.put.mockRejectedValue(new Error('Cache unavailable'))
    vi.stubGlobal('fetch', vi.fn(async () => new Response(successful())))
    expect(await consume(await streamAnswer('key', paper, question, null, undefined, options))).toBe(answer)
  })

  it('does not store a cancelled generation', async () => {
    const cancelled = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode(event({ choices: [{ delta: { content: 'Partial' } }] }))) },
      cancel: cancelled,
    }))))
    const response = await streamAnswer('key', paper, question, null, undefined, options)
    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(cancelled).toHaveBeenCalled()
    expect(entries.size).toBe(0)
  })

  it('uses shorter expiry for mutable PDF URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(successful())))
    await consume(await streamAnswer('key', { ...paper, format: 'pdf', text: '' }, question, 'https://arxiv.org/pdf/1706.03762', undefined, options))
    expect([...entries.values()][0].headers.get('Cache-Control')).toBe('public, max-age=21600')
  })

  it('hashes all model settings and keeps raw input out of the cache URL', async () => {
    const original = await answerCacheKey(JSON.stringify({ model: 'model-a', prompt: 'private question' }))
    const changed = await answerCacheKey(JSON.stringify({ model: 'model-b', prompt: 'private question' }))
    expect(original.url).not.toContain('private')
    expect(original.url).not.toBe(changed.url)
    expect(validateChatRequest({ paperId: paper.id, messages: question, regenerate: 'yes' })).toBe('Invalid regenerate option.')
  })

  it('allows a cached replay to be cancelled', async () => {
    const reader = replayAnswer(answer).getReader()
    const first = await reader.read()
    expect(first.done).toBe(false)
    await reader.cancel()
    expect((await reader.read()).done).toBe(true)
  })
})
