import { STREAM_ERROR_MARKER, type ChatMessage, type ChatRequest } from '../shared/types'
import type { LoadedPaper } from './paper'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-6-luna'

// GPT-6 Luna accepts about 922K prompt tokens. Keep room for the chat itself.
export const MAX_PAPER_TOKENS = 800_000
// A conservative estimate for math-heavy text. English prose is closer to 4.
const CHARS_PER_TOKEN = 3.2

const MAX_MESSAGES = 40
const MAX_CONTENT_LENGTH = 20_000
const MAX_QUOTE_LENGTH = 10_000

export function validateChatRequest(body: unknown): string | null {
  const request = body as Partial<ChatRequest> | null
  if (!request || typeof request.paperId !== 'string') return 'Missing paperId.'
  const messages = request.messages
  if (!Array.isArray(messages) || messages.length === 0) return 'Missing messages.'
  if (messages.length > 200) return 'Too many messages.'
  for (const message of messages as Partial<ChatMessage>[]) {
    if (message.role !== 'user' && message.role !== 'assistant') return 'Invalid message role.'
    if (typeof message.content !== 'string' || message.content.length > MAX_CONTENT_LENGTH) {
      return 'Each message must be text under 20,000 characters.'
    }
    if (message.quote != null) {
      if (typeof message.quote !== 'string' || message.quote.length > MAX_QUOTE_LENGTH) {
        return 'Highlighted passages must be under 10,000 characters.'
      }
    }
  }
  if (messages[messages.length - 1].role !== 'user') return 'The last message must be from the user.'
  return null
}

export function estimateTokens(paper: LoadedPaper) {
  return Math.ceil(paper.text.length / CHARS_PER_TOKEN)
}

export function paperFitsContext(paper: LoadedPaper) {
  return estimateTokens(paper) <= MAX_PAPER_TOKENS
}

export async function streamAnswer(
  apiKey: string,
  paper: LoadedPaper,
  messages: ChatMessage[],
): Promise<Response> {
  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://talk2arxiv.org',
      'X-Title': 'Talk2Arxiv',
    },
    body: JSON.stringify({
      model: MODEL,
      provider: { only: ['openai'], allow_fallbacks: false },
      reasoning: { effort: 'low', exclude: true },
      max_tokens: 8000,
      stream: true,
      // The paper goes first and never changes, so OpenAI caches it
      // across the questions in a conversation.
      messages: [
        { role: 'system', content: systemPrompt(paper) },
        ...messages.slice(-MAX_MESSAGES).map(toModelMessage),
      ],
    }),
  })

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: await describeUpstreamError(upstream) }, { status: 502 })
  }

  return new Response(toTextStream(upstream.body), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function systemPrompt(paper: LoadedPaper) {
  return `You are Talk2Arxiv, an expert research assistant. A reader is studying the arXiv paper below and asks you about it.

- Base your answers on the paper. When you add background knowledge that is not in the paper, say so.
- Refer to sections, figures, tables, and equations by their numbers, so the reader can find them.
- Quote the paper briefly when it helps.
- When the reader highlights a passage, explain that passage in the context of the whole paper.
- Lead with the answer. Be concise unless the reader asks for depth.
- Use Markdown. Write math in LaTeX: $...$ inline and $$...$$ for display equations.
- If the paper does not answer the question, say so plainly.

<paper id="${paper.id}" title="${paper.title.replace(/"/g, "'")}">
${paper.text}
</paper>`
}

function toModelMessage(message: ChatMessage) {
  if (message.role === 'user' && message.quote) {
    return {
      role: 'user',
      content: `Highlighted passage from the paper:\n"""\n${message.quote}\n"""\n\n${message.content}`,
    }
  }
  return { role: message.role, content: message.content }
}

async function describeUpstreamError(response: Response) {
  let message = ''
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    message = body.error?.message ?? ''
  } catch {
    // Not JSON. Fall through to the generic message.
  }
  console.error('OpenRouter error', response.status, message)
  if (/context|too long|maximum.*tokens/i.test(message)) {
    return "This paper is too long to fit in the model's context window."
  }
  if (response.status === 401 || response.status === 402) {
    return 'The model service is not available right now (API key or credit problem).'
  }
  if (response.status === 429) return 'The model is busy. Try again in a moment.'
  return 'The model could not answer. Try again in a moment.'
}

// Turns OpenRouter's server-sent events into a plain stream of answer text.
function toTextStream(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const emit = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const text = parseEvent(line)
    if (text) controller.enqueue(encoder.encode(text))
  }

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) emit(line, controller)
      },
      flush(controller) {
        emit(buffer, controller)
      },
    }),
  )
}

interface StreamEvent {
  error?: { message?: string }
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
}

function parseEvent(line: string): string {
  if (!line.startsWith('data:')) return ''
  const data = line.slice(5).trim()
  if (!data || data === '[DONE]') return ''

  let event: StreamEvent
  try {
    event = JSON.parse(data)
  } catch {
    return ''
  }
  if (event.error) {
    console.error('OpenRouter stream error', event.error.message)
    return `${STREAM_ERROR_MARKER}The model stopped with an error. Try again.`
  }
  const choice = event.choices?.[0]
  const content = choice?.delta?.content ?? ''
  if (choice?.finish_reason === 'length') {
    return `${content}${STREAM_ERROR_MARKER}The answer was cut off because it was too long.`
  }
  return content
}
