import type { ApiError, ChatRequest, Paper } from '../shared/types'
import { estimateTokens, MAX_PAPER_TOKENS, paperFitsContext, streamAnswer, validateChatRequest } from './chat'
import { isPaperId, SITE_ORIGINS } from '../shared/papers'
import { getPaperMeta } from './meta'
import { getPaper, PaperError, type LoadedPaper } from './paper'
import { getPdf, pdfDataUrl } from './pdf'

// In production, Vercel hosts the React app and rewrites /api/* to this Worker
// (see vercel.json). In local dev, Vite serves both from one server.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    try {
      if (request.method === 'GET' && url.pathname.startsWith('/api/paper/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/paper/'.length))
        const paper = await loadPaper(id, ctx)
        const body: Paper = {
          id: paper.id,
          source: paper.source,
          format: paper.format,
          title: paper.title,
          sourceUrl: paper.sourceUrl,
          html: paper.html,
        }
        // s-maxage lets Vercel's CDN, which proxies /api/*, cache papers for a day.
        return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/pdf/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/pdf/'.length))
        if (!isPaperId(id)) throw new PaperError(`"${id}" is not an arXiv ID or bioRxiv DOI.`, 400)
        const pdf = await getPdf(id, ctx)
        return new Response(pdf.body, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
          },
        })
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/meta/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/meta/'.length))
        if (!isPaperId(id)) throw new PaperError(`"${id}" is not an arXiv ID or bioRxiv DOI.`, 400)
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

  // PDF papers go to the model as the file. The provider fetches it by URL
  // from the public site, whose CDN caches it, except in local dev, where the
  // PDF goes inline.
  let pdf: string | null = null
  if (paper.format === 'pdf') {
    const { hostname } = new URL(request.url)
    const local = hostname === 'localhost' || hostname === '127.0.0.1'
    pdf = local ? await pdfDataUrl(paper.id, ctx) : `${SITE_ORIGINS[paper.source]}/api/pdf/${paper.id}`
  }

  return streamAnswer(env.OPENROUTER_API_KEY, paper, body.messages, pdf)
}

function loadPaper(id: string, ctx: ExecutionContext): Promise<LoadedPaper> {
  if (!isPaperId(id)) throw new PaperError(`"${id}" is not an arXiv ID or bioRxiv DOI.`, 400)
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
