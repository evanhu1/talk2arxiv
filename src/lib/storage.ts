import type { ChatMessage } from '../../shared/types'

// Browser storage can be missing or full. Every access fails quietly.
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore: history is a convenience, not a requirement.
  }
}

export interface StoredMessage extends ChatMessage {
  error?: string
}

const chatKey = (paperId: string) => `talk2arxiv:chat:${paperId}`

export function loadChat(paperId: string): StoredMessage[] {
  const messages = read<unknown>(chatKey(paperId), [])
  return Array.isArray(messages) ? (messages as StoredMessage[]) : []
}

export function saveChat(paperId: string, messages: StoredMessage[]) {
  write(chatKey(paperId), messages.length ? messages : null)
}

export function loadNumber(key: string, fallback: number) {
  const value = read<unknown>(key, fallback)
  return typeof value === 'number' ? value : fallback
}

export function saveNumber(key: string, value: number) {
  write(key, value)
}
