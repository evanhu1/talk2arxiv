import { next } from '@vercel/functions'
// Vercel runs this file as Node ESM without bundling, so imports need .js.
import { paperIdFromPath, readerPath, SOURCE_NAMES, sourceOf, type Source } from './shared/papers.js'
import type { PaperMeta } from './shared/types.js'

// Vercel Routing Middleware. Link-preview bots (Slack, iMessage, X, Discord…)
// do not run JavaScript, so they would only see the app's generic tags. For
// those bots, paper URLs (and the talk2biorxiv.org home page) get a small page
// whose tags name the paper or site. Everyone else, search engines included,
// gets the normal app.
export const config = {
  runtime: 'nodejs',
  matcher: ['/', '/abs/:path*', '/pdf/:path*', '/html/:path*', '/content/:path*'],
}


const SITES: Record<Source, { origin: string; name: string; image: string; tagline: string; description: string }> = {
  arxiv: {
    origin: 'https://www.talk2arxiv.org',
    name: 'Talk2Arxiv',
    image: 'https://www.talk2arxiv.org/og.png',
    tagline: 'Talk to any arXiv paper',
    description:
      'Change arxiv.org to talk2arxiv.org in any paper link to read the paper and ask an AI that has read all of it.',
  },
  biorxiv: {
    origin: 'https://www.talk2biorxiv.org',
    name: 'Talk2bioRxiv',
    image: 'https://www.talk2biorxiv.org/og-biorxiv.png',
    tagline: 'Talk to any bioRxiv paper',
    description:
      'Change biorxiv.org to talk2biorxiv.org in any paper link to read the paper and ask an AI that has read all of it.',
  },
}

const PREVIEW_BOTS =
  /facebookexternalhit|facebot|twitterbot|slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|iframely|vkshare|mastodon|bluesky|cardyb|snapchat|microsoftpreview/i

export default async function middleware(request: Request) {
  if (!PREVIEW_BOTS.test(request.headers.get('user-agent') ?? '')) return next()

  const url = new URL(request.url)
  // "bio" also matches the misspelled talk2bioarxiv.org, which redirects here.
  const hostSite: Source = url.hostname.includes('bio') ? 'biorxiv' : 'arxiv'

  if (url.pathname === '/') {
    // The generic tags in index.html already describe talk2arxiv.org.
    if (hostSite === 'arxiv') return next()
    const site = SITES.biorxiv
    return preview({ title: site.tagline, description: site.description, pageUrl: `${site.origin}/`, site, type: 'website' })
  }

  const id = paperIdFromPath(url.pathname)
  const source = id ? sourceOf(id) : null
  if (!id || !source) return next()

  // A shared paper link sells the paper: its title, and an image of its first
  // page (title, authors, abstract) from /api/og. The description stays the
  // site's pitch.
  const site = SITES[source]
  const meta = await fetchMeta(site.origin, id)
  return preview({
    title: meta ? `Talk to ${meta.title}` : `Talk to this ${SOURCE_NAMES[source]} paper`,
    description: site.description,
    pageUrl: site.origin + readerPath(id),
    site,
    type: 'article',
    image: `${site.origin}/api/og?id=${encodeURIComponent(id)}`,
    imageAlt: meta ? meta.title : site.tagline,
  })
}

// Through the public site, so the CDN answers repeat requests. The first
// request may wait on a slow, rate-limited source, so allow it time.
async function fetchMeta(origin: string, id: string): Promise<PaperMeta | null> {
  try {
    const response = await fetch(`${origin}/api/meta/${id}`, { signal: AbortSignal.timeout(8000) })
    return response.ok ? ((await response.json()) as PaperMeta) : null
  } catch {
    return null
  }
}

interface Preview {
  title: string
  // Defaults to the site's image.
  image?: string
  imageAlt?: string
  description: string
  pageUrl: string
  site: (typeof SITES)[Source]
  type: 'website' | 'article'
}

function preview(page: Preview) {
  return new Response(previewPage(page), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Private: the CDN must never serve this bot page to a person.
      'Cache-Control': 'private, max-age=3600',
      Vary: 'User-Agent',
    },
  })
}

function previewPage({ title, description, pageUrl, site, type, image = site.image, imageAlt }: Preview) {
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
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(imageAlt ?? `${site.name}: ${site.tagline.toLowerCase()}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<h1>${t}</h1>
<p>${d}</p>
<p><a href="${u}">Open on ${site.name}</a></p>
</body>
</html>
`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
