import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../shared/types'
import { streamChat } from './api'
import { loadChat, saveChat, type StoredMessage } from './storage'

export interface Chat {
  messages: StoredMessage[]
  streaming: boolean
  send: (content: string, quote?: string) => void
  retry: () => void
  stop: () => void
  clear: () => void
}

export function useChat(paperId: string): Chat {
  const [messages, setMessages] = useState<StoredMessage[]>(() => loadChat(paperId))
  const [streaming, setStreaming] = useState(false)
  const messagesRef = useRef(messages)
  const abortRef = useRef<AbortController | null>(null)
  messagesRef.current = messages

  useEffect(() => {
    if (!streaming) saveChat(paperId, messages)
  }, [paperId, messages, streaming])

  useEffect(() => () => abortRef.current?.abort(), [])

  const run = useCallback(
    async (history: StoredMessage[]) => {
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      setMessages([...history, { role: 'assistant', content: '' }])

      let latest = ''
      const setAnswer = (content: string, error?: string) =>
        setMessages((current) => [
          ...current.slice(0, -1),
          { role: 'assistant', content, ...(error ? { error } : {}) },
        ])

      try {
        const result = await streamChat(
          { paperId, messages: toRequestMessages(history) },
          (text) => {
            latest = text
            setAnswer(text)
          },
          controller.signal,
        )
        setAnswer(result.text, result.error)
      } catch {
        if (controller.signal.aborted) setAnswer(latest)
        else setAnswer(latest, 'Could not reach Talk2Arxiv. Check your connection and try again.')
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setStreaming(false)
      }
    },
    [paperId],
  )

  const send = useCallback(
    (content: string, quote?: string) => {
      if (abortRef.current) return
      const text = content.trim() || (quote ? 'Explain this passage.' : '')
      if (!text) return
      const message: StoredMessage = { role: 'user', content: text, ...(quote ? { quote } : {}) }
      run([...messagesRef.current, message])
    },
    [run],
  )

  // Asks the last question again after a failed or unwanted answer.
  const retry = useCallback(() => {
    if (abortRef.current) return
    const history = messagesRef.current
    const lastUser = history.map((m) => m.role).lastIndexOf('user')
    if (lastUser >= 0) run(history.slice(0, lastUser + 1))
  }, [run])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
  }, [])

  return { messages, streaming, send, retry, stop, clear }
}

// Drops empty or failed answers; the model only needs the real conversation.
function toRequestMessages(history: StoredMessage[]): ChatMessage[] {
  return history
    .filter((m) => m.role === 'user' || m.content.trim())
    .map(({ role, content, quote }) => (quote ? { role, content, quote } : { role, content }))
}
