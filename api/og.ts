import { createElement as h, type CSSProperties, type ReactElement } from 'react'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

// GET /api/og?id=<paper id>: the link-preview image for a paper, 1200x630 PNG.
// middleware.ts points og:image here for paper links.
//
// Everything lives in this one file on purpose: Vercel compiles functions
// file by file, and relative imports between them break at runtime.
// (Vercel serves this function before vercel.json rewrites /api/* to the Worker.)

// The Worker that serves paper metadata.
const META_API = 'https://talk2arxiv.hu-evan123.workers.dev/api/meta/'
const WIDTH = 1200
const HEIGHT = 630

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[\w./-]{4,80}$/.test(id)) return new Response('Missing or invalid id', { status: 400 })

  const biorxiv = /^10\.\d{4,9}\//.test(id)
  const site = biorxiv ? 'talk2biorxiv.org' : 'talk2arxiv.org'
  const meta = await fetchMeta(id)
  // Without metadata, fall back to the site's generic image.
  if (!meta) {
    return Response.redirect(`https://www.${site}/${biorxiv ? 'og-biorxiv.png' : 'og.png'}`, 302)
  }

  const png = await renderCard({
    site,
    sourceLabel: biorxiv ? `bioRxiv · doi:${id}` : `arXiv:${id}`,
    title: meta.title,
    authors: meta.authors ?? [],
    abstract: meta.abstract,
  })
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // A paper's title and abstract do not change, so let the CDN keep it.
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
    },
  })
}

interface Meta {
  title: string
  authors?: string[]
  abstract: string
}

async function fetchMeta(id: string): Promise<Meta | null> {
  try {
    const response = await fetch(META_API + id, { signal: AbortSignal.timeout(9000) })
    return response.ok ? ((await response.json()) as Meta) : null
  } catch {
    return null
  }
}

// Satori lays the card out as SVG; resvg rasterizes it to PNG.
export async function renderCard(input: CardInput): Promise<Buffer> {
  const svg = await satori(paperCard(input), { width: WIDTH, height: HEIGHT, fonts: await loadFonts() })
  return new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()
}

// The link-preview image for a paper: a sheet of paper with its title,
// authors, and the start of its abstract. Rendered by @vercel/og (Satori),
// which supports a subset of CSS: flexbox, no grid, no line clamping.

interface CardInput {
  site: string // talk2arxiv.org or talk2biorxiv.org
  sourceLabel: string // e.g. "bioRxiv · doi:10.1101/2021.10.04.463034v2"
  title: string
  authors: string[]
  abstract: string
}

const INK = '#1b1a18'
const MUTED = '#6b6862'
const FAINT = '#a19d96'
const ACCENT = '#b31b1b'
const CANVAS = '#f5f5f3'
const LINE = '#e5e3df'

function paperCard({ site, sourceLabel, title, authors, abstract }: CardInput): ReactElement {
  const titleSize = title.length > 90 ? 44 : title.length > 55 ? 50 : 58
  // Long titles take more lines, so show less abstract.
  const abstractLength = title.length > 75 ? 260 : title.length > 40 ? 360 : 420

  return h(
    'div',
    { style: { ...fill, flexDirection: 'column', background: CANVAS, padding: '44px 56px 0' } },
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          // Fill the space above the footer, and clip rather than push it out.
          flexGrow: 1,
          flexShrink: 1,
          minHeight: 0,
          background: '#fff',
          border: `1px solid ${LINE}`,
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '44px 56px 0',
          overflow: 'hidden',
          position: 'relative',
        },
      },
      h('div', { style: { ...sans, fontSize: 20, color: FAINT, letterSpacing: 0.3 } }, sourceLabel),
      h(
        'div',
        { style: { ...serif, fontSize: titleSize, fontWeight: 700, lineHeight: 1.15, color: INK, marginTop: 18 } },
        clip(title, 150),
      ),
      authors.length > 0 &&
        h('div', { style: { ...sans, fontSize: 22, color: MUTED, marginTop: 20 } }, authorLine(authors)),
      h(
        'div',
        { style: { ...serif, fontSize: 24, lineHeight: 1.55, color: '#3a3834', marginTop: 26 } },
        clip(abstract, abstractLength),
      ),
      // Fade the abstract out toward the bottom edge.
      h('div', {
        style: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 150,
          backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff)',
        },
      }),
    ),
    h(
      'div',
      {
        style: {
          ...sans,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 84,
          flexShrink: 0,
          fontSize: 24,
          color: MUTED,
        },
      },
      h(
        'div',
        { style: { display: 'flex' } },
        'Talk to this paper at ',
        h('span', { style: { color: ACCENT, fontWeight: 600 } }, 'talk2'),
        h('span', { style: { color: INK, fontWeight: 600 } }, site.replace(/^talk2/, '')),
      ),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', color: FAINT, fontSize: 20 } },
        'Highlight anything. Ask the AI.',
      ),
    ),
  )
}

const fill: CSSProperties = { display: 'flex', width: '100%', height: '100%' }
const sans: CSSProperties = { display: 'flex', fontFamily: 'Geist' }
const serif: CSSProperties = { display: 'flex', fontFamily: 'Source Serif 4' }

function authorLine(authors: string[]) {
  if (authors.length <= 3) return authors.join(', ')
  return `${authors.slice(0, 3).join(', ')}, et al.`
}

// Cut at a word boundary. Satori has no line clamping.
function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, clean.lastIndexOf(' ', max)).replace(/[,.;:]$/, '')}…`
}

// TrueType fonts for @vercel/og, looked up from Google Fonts once per instance.
// Google Fonts serves .ttf to clients that do not ask for woff2.
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&family=Geist:wght@400;600'

interface OgFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 700 | 600
  style: 'normal'
}

let fonts: Promise<OgFont[]> | null = null

function loadFonts(): Promise<OgFont[]> {
  fonts ??= fetchFonts().catch((err) => {
    fonts = null // Try again on the next request.
    throw err
  })
  return fonts
}

async function fetchFonts(): Promise<OgFont[]> {
  const css = await (await fetch(CSS_URL)).text()
  const faces = [...css.matchAll(/font-family: '([^']+)';[\s\S]*?font-weight: (\d+);[\s\S]*?url\(([^)]+\.ttf)\)/g)]
  return Promise.all(
    faces.map(async ([, name, weight, url]) => ({
      name,
      data: await (await fetch(url)).arrayBuffer(),
      weight: Number(weight) as OgFont['weight'],
      style: 'normal' as const,
    })),
  )
}
