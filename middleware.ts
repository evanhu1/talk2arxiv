import { next } from '@vercel/functions'
import type { PaperMeta } from './shared/types'

// Vercel Routing Middleware. Link-preview bots (Slack, iMessage, X, Discord…)
// do not run JavaScript, so they would only see the app's generic tags. For
// those bots, paper URLs get a small page whose tags name the paper. Everyone
// else, search engines included, gets the normal app.
export const config = {
  runtime: 'nodejs',
  matcher: ['/abs/:path*', '/pdf/:path*', '/html/:path*'],
}

// The same Worker that vercel.json rewrites /api/* to.
const API = 'https://talk2arxiv.hu-evan123.workers.dev/api/meta/'
const SITE = 'https://www.talk2arxiv.org'
const IMAGE = `${SITE}/og.png`

const PREVIEW_BOTS =
  /facebookexternalhit|facebot|twitterbot|slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|iframely|vkshare|mastodon|bluesky|cardyb|snapchat|microsoftpreview/i

export default async function middleware(request: Request) {
  if (!PREVIEW_BOTS.test(request.headers.get('user-agent') ?? '')) return next()

  const url = new URL(request.url)
  const id = url.pathname.replace(/^\/(abs|pdf|html)\//, '').replace(/(\.pdf)?\/?$/, '')
  const meta = await fetchMeta(id)
  const pageUrl = `${SITE}/abs/${id}`
  const title = meta ? `Talk to ${meta.title}` : `Talk to arXiv:${id}`
  const description = meta?.abstract ? truncate(meta.abstract, 200) : 'Read this arXiv paper and ask an AI about it.'

  return new Response(previewPage({ title, description, pageUrl }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}

async function fetchMeta(id: string): Promise<PaperMeta | null> {
  try {
    const response = await fetch(API + id, { signal: AbortSignal.timeout(4000) })
    return response.ok ? ((await response.json()) as PaperMeta) : null
  } catch {
    return null
  }
}

function previewPage({ title, description, pageUrl }: { title: string; description: string; pageUrl: string }) {
  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const u = escapeHtml(pageUrl)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Talk2Arxiv">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Talk2Arxiv: talk to any arXiv paper">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${IMAGE}">
</head>
<body>
<h1>${t}</h1>
<p>${d}</p>
<p><a href="${u}">Open on Talk2Arxiv</a></p>
</body>
</html>
`
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, text.lastIndexOf(' ', max - 1)).replace(/[,.;:]$/, '')}…`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
