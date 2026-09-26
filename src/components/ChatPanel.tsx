import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AlertCircle, ArrowUp, Check, Copy, Quote, RotateCcw, Square, X } from 'lucide-react'
import type { Chat } from '../lib/useChat'
import type { StoredMessage } from '../lib/storage'
import DeleteButton from './ui/delete-button'
import Markdown from './Markdown'
import ThinkingOrb from './ThinkingOrb'

const SUGGESTIONS = [
  'Summarize this paper in a few bullet points',
  'What problem does it solve, and how?',
  'Walk me through the method step by step',
  'What are the main results and limitations?',
]

interface Props {
  chat: Chat
  quote: string | null
  onClearQuote: () => void
  onSend: (text: string) => void
  composerRef: RefObject<HTMLTextAreaElement | null>
}

export default function ChatPanel({ chat, quote, onClearQuote, onSend, composerRef }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useLayoutEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [chat.messages])

  const send = (text: string) => {
    stickToBottom.current = true
    onSend(text)
  }

  const lastIndex = chat.messages.length - 1

  return (
    <div className="relative flex h-full flex-col bg-surface">
      {chat.messages.length > 0 && (
        <DeleteButton
          onConfirm={chat.clear}
          title="Clear chat"
          className="absolute top-2 right-2 z-10 origin-top-right scale-[0.66] bg-subtle text-muted dark:bg-subtle dark:text-muted"
        />
      )}

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className={`min-h-0 flex-1 overflow-y-auto px-4 pb-5 ${chat.messages.length > 0 ? 'pt-12' : 'pt-5'}`}
      >
        {chat.messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="flex flex-col gap-6">
            {chat.messages.map((message, index) =>
              message.role === 'user' ? (
                <UserMessage key={index} message={message} />
              ) : (
                <AssistantMessage
                  key={index}
                  message={message}
                  isLast={index === lastIndex}
                  streaming={chat.streaming && index === lastIndex}
                  onRetry={chat.retry}
                />
              ),
            )}
          </div>
        )}
      </div>

      <Composer
        quote={quote}
        onClearQuote={onClearQuote}
        onSend={send}
        streaming={chat.streaming}
        onStop={chat.stop}
        inputRef={composerRef}
      />
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex min-h-full flex-col justify-end gap-5">
      <p className="font-serif text-[22px] leading-tight font-semibold">Ask anything about this paper</p>
      <div className="flex flex-col gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-xl border border-line px-3.5 py-2.5 text-left text-[13.5px] text-ink transition-colors hover:border-faint hover:bg-subtle"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

function UserMessage({ message }: { message: StoredMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-subtle px-3.5 py-2.5 text-[14px] leading-relaxed">
        {message.quote && (
          <p className="mb-2 line-clamp-4 border-l-2 border-accent pl-2.5 font-serif text-[13px] text-muted italic">
            {message.quote}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

function AssistantMessage({
  message,
  isLast,
  streaming,
  onRetry,
}: {
  message: StoredMessage
  isLast: boolean
  streaming: boolean
  onRetry: () => void
}) {
  return (
    <div className="group">
      {message.content ? (
        <Markdown text={message.content} />
      ) : (
        streaming && (
          <div className="flex items-center gap-2.5 text-[13px] text-muted">
            <ThinkingOrb active size={18} />
            Reading the paper…
          </div>
        )
      )}

      {message.error && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
          <AlertCircle className="mt-px size-4 shrink-0" />
          <span className="flex-1">{message.error}</span>
          {isLast && (
            <button type="button" onClick={onRetry} className="shrink-0 font-medium underline-offset-2 hover:underline">
              Retry
            </button>
          )}
        </div>
      )}

      {message.content && !streaming && (
        <div className="mt-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <CopyButton text={message.content} />
          {isLast && (
            <IconButton label="Regenerate" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <IconButton
      label={copied ? 'Copied' : 'Copy'}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </IconButton>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-md text-faint hover:bg-subtle hover:text-ink"
    >
      {children}
    </button>
  )
}

function Composer({
  quote,
  onClearQuote,
  onSend,
  streaming,
  onStop,
  inputRef,
}: {
  quote: string | null
  onClearQuote: () => void
  onSend: (text: string) => void
  streaming: boolean
  onStop: () => void
  inputRef: RefObject<HTMLTextAreaElement | null>
}) {
  const [text, setText] = useState('')
  const canSend = !streaming && (text.trim().length > 0 || quote !== null)

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`
  }, [text, inputRef])

  const submit = () => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  return (
    <div className="shrink-0 border-t border-line p-3">
      <div className="rounded-2xl border border-line bg-canvas transition-colors focus-within:border-faint">
        {quote && (
          <div className="flex items-start gap-2 border-b border-line py-2 pr-2 pl-3">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <p className="line-clamp-3 flex-1 font-serif text-[13px] leading-snug text-muted">{quote}</p>
            <button
              type="button"
              onClick={onClearQuote}
              title="Remove highlight"
              aria-label="Remove highlight"
              className="grid size-6 shrink-0 place-items-center rounded-md text-faint hover:bg-subtle hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 p-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={quote ? 'Ask about the highlighted passage…' : 'Ask about this paper…'}
            className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-faint"
          />
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop"
              aria-label="Stop answering"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-surface"
            >
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title="Send"
              aria-label="Send"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-white transition-opacity hover:bg-accent-strong disabled:opacity-30"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
