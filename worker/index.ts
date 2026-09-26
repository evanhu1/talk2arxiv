import type { ApiError, ChatRequest, Paper } from '../shared/types'
import { estimateTokens, MAX_PAPER_TOKENS, paperFitsContext, streamAnswer, validateChatRequest } from './chat'
import { getPaperMeta } from './meta'
import { getPaper, isArxivId, PaperError, type LoadedPaper } from './paper'

// In production, Vercel hosts the React app and rewrites /api/* to this Worker
// (see vercel.json). In local dev, Vite serves both from one server.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    try {
      if (request.method === 'GET' && url.pathname.startsWith('/api/paper/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/paper/'.length))
        const paper = await loadPaper(id, ctx)
        const body: Paper = { id: paper.id, title: paper.title, sourceUrl: paper.sourceUrl, html: paper.html }
        // s-maxage lets Vercel's CDN, which proxies /api/*, cache papers for a day.
        return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/meta/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/meta/'.length))
        if (!isArxivId(id)) throw new PaperError(`"${id}" is not a valid arXiv ID.`, 400)
        const meta = await getPaperMeta(id, ctx)
        return Response.json(meta, { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } })
      }

      if (request.method === 'POST' && url.pathname === '/api/chat') {
        return await handleChat(request, env, ctx)
      }

      return error('Not found.', 404)
    } catch (err) {
      if (err instanceof PaperError) return error(err.message, err.status)
      console.error(err)
      return error('Something went wrong on our side. Try again.', 500)
    }
  },
} satisfies ExportedHandler<Env>

async function handleChat(request: Request, env: Env, ctx: ExecutionContext) {
  const ip = clientIp(request)
  const { success } = await env.CHAT_LIMITER.limit({ key: ip })
  if (!success) return error('You are sending questions too fast. Wait a minute and try again.', 429)

  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return error('Invalid request.', 400)
  }
  const problem = validateChatRequest(body)
  if (problem) return error(problem, 400)

  const paper = await loadPaper(body.paperId, ctx)
  if (!paperFitsContext(paper)) {
    const thousands = (tokens: number) => `${Math.round(tokens / 1000)}K`
    return error(
      `This paper is too long to chat about (about ${thousands(estimateTokens(paper))} tokens). ` +
        `The limit is about ${thousands(MAX_PAPER_TOKENS)} tokens.`,
      413,
    )
  }

  return streamAnswer(env.OPENROUTER_API_KEY, paper, body.messages)
}

function loadPaper(id: string, ctx: ExecutionContext): Promise<LoadedPaper> {
  if (!isArxivId(id)) throw new PaperError(`"${id}" is not a valid arXiv ID.`, 400)
  return getPaper(id, ctx)
}

// In production, Vercel proxies /api/* here, so CF-Connecting-IP is a Vercel
// server. Vercel passes the visitor's address in x-real-ip / x-forwarded-for.
function clientIp(request: Request) {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('CF-Connecting-IP') ??
    'unknown'
  )
}

function error(message: string, status: number) {
  const body: ApiError = { error: message }
  return Response.json(body, { status })
}
