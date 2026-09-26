import { STREAM_ERROR_MARKER, type ChatRequest, type Paper } from '../../shared/types'

export async function fetchPaper(id: string, signal: AbortSignal): Promise<Paper> {
  const response = await fetch(`/api/paper/${id}`, { signal })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? `Could not load the paper (error ${response.status}).`)
  return body as Paper
}

export interface ChatResult {
  text: string
  error?: string
}

// Streams the answer. `onText` gets the full answer so far on each chunk.
export async function streamChat(
  request: ChatRequest,
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<ChatResult> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    return { text: '', error: body?.error ?? `The request failed (error ${response.status}).` }
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let received = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value
    const markerAt = received.indexOf(STREAM_ERROR_MARKER)
    if (markerAt >= 0) {
      await reader.cancel().catch(() => {})
      return {
        text: received.slice(0, markerAt),
        error: received.slice(markerAt + STREAM_ERROR_MARKER.length),
      }
    }
    onText(received)
  }
  if (!received.trim()) return { text: '', error: 'The model returned an empty answer. Try again.' }
  return { text: received }
}
