// Types shared by the Worker (worker/) and the browser app (src/).

export interface Paper {
  id: string
  title: string
  // The URL the HTML came from. Relative links in `html` are already absolute.
  sourceUrl: string
  // The <article> element of the arXiv HTML5 render. Not sanitized.
  html: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  // A passage the reader highlighted in the paper and asked about.
  quote?: string
}

export interface ChatRequest {
  paperId: string
  messages: ChatMessage[]
}

export interface ApiError {
  error: string
}

// The answer stream is plain text. If the model fails partway, the Worker
// appends this marker and an error message, and the client splits on it.
export const STREAM_ERROR_MARKER = '\u0000ERROR:'
