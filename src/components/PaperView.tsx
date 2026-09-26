import { useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import DOMPurify from 'dompurify'
import { FileWarning } from 'lucide-react'
import type { Paper } from '../../shared/types'
import { fetchPaper } from '../lib/api'
import { SOURCE_NAMES, sourceOf, sourcePageUrl, sourcePdfUrl } from '../../shared/papers'

export interface OutlineItem {
  id: string
  label: string
  level: 1 | 2
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; paper: Paper }

interface Props {
  paperId: string
  articleRef: RefObject<HTMLDivElement | null>
  onLoaded: (paper: Paper, outline: OutlineItem[]) => void
}

export default function PaperView({ paperId, articleRef, onLoaded }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchPaper(paperId, controller.signal)
      .then((paper) => setState({ status: 'ready', paper }))
      .catch((err: Error) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: err.message })
      })
    return () => controller.abort()
  }, [paperId])

  const html = useMemo(() => (state.status === 'ready' ? sanitize(state.paper.html) : ''), [state])

  useLayoutEffect(() => {
    if (state.status !== 'ready' || !articleRef.current) return
    onLoaded(state.paper, buildOutline(articleRef.current))
    // onLoaded is a fresh function each render. Run once per loaded paper.
  }, [state, articleRef])

  if (state.status === 'loading') return <Skeleton paperId={paperId} />
  if (state.status === 'error') return <LoadError paperId={paperId} message={state.message} />

  return (
    <div className="mx-auto w-full max-w-[860px] px-3 py-4 md:px-8 md:py-8">
      <div className="rounded-2xl border border-line bg-surface px-5 py-8 shadow-[0_1px_2px_rgb(0_0_0/0.03)] md:px-14 md:py-14">
        <div ref={articleRef} className="paper" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <p className="mt-4 text-center text-[12px] text-faint">
        HTML rendering from {sourceName(paperId)}.{' '}
        <a href={sourcePdfUrl(paperId)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted">
          View the PDF
        </a>{' '}
        if anything looks wrong.
      </p>
    </div>
  )
}

// The HTML comes from arXiv or bioRxiv, but authors control its contents. Strip scripts,
// event handlers, and forms, and keep MathML and SVG for equations and figures.
// `alttext` and <annotation> hold each equation's LaTeX source, which quotes
// sent to the model use. <annotation-xml> stays out: it can carry HTML.
function sanitize(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true, svg: true },
    ADD_TAGS: ['foreignObject', 'semantics', 'annotation'],
    ADD_ATTR: ['target', 'alttext', 'encoding'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
  })
}

function buildOutline(root: HTMLElement): OutlineItem[] {
  const items: OutlineItem[] = []
  const abstract = root.querySelector<HTMLElement>('.ltx_abstract')
  if (abstract) {
    abstract.id ||= 'abstract'
    items.push({ id: abstract.id, label: 'Abstract', level: 1 })
  }
  // arXiv (LaTeXML): <section><h2 class="ltx_title">. bioRxiv: <div class="section"><h2>.
  const headings = 'section > h2.ltx_title, section > h3.ltx_title, div.section > h2, div.subsection > h3'
  for (const heading of root.querySelectorAll<HTMLElement>(headings)) {
    const section = heading.parentElement!
    section.id ||= `section-${items.length}`
    const label = headingText(heading)
    if (label) items.push({ id: section.id, label, level: heading.tagName === 'H2' ? 1 : 2 })
  }
  return items
}

function headingText(heading: HTMLElement) {
  const copy = heading.cloneNode(true) as HTMLElement
  for (const math of copy.querySelectorAll('math')) math.replaceWith(math.getAttribute('alttext') ?? '')
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function Skeleton({ paperId }: { paperId: string }) {
  return (
    <div className="mx-auto w-full max-w-[860px] px-3 py-4 md:px-8 md:py-8" aria-busy="true">
      <div className="rounded-2xl border border-line bg-surface px-5 py-8 md:px-14 md:py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-4/5 rounded-lg bg-subtle" />
          <div className="h-8 w-3/5 rounded-lg bg-subtle" />
          <div className="h-4 w-2/5 rounded bg-subtle" />
          <div className="mt-10 h-32 rounded-xl bg-subtle" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-4 rounded bg-subtle" style={{ width: `${92 - ((i * 17) % 30)}%` }} />
          ))}
        </div>
        <p className="mt-8 text-center text-[13px] text-muted">Fetching the paper from {sourceName(paperId)}…</p>
      </div>
    </div>
  )
}

function LoadError({ paperId, message }: { paperId: string; message: string }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <FileWarning className="size-6" />
      </div>
      <p className="mt-5 font-serif text-xl font-semibold">We could not open this paper</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-[13px] font-medium">
        <a
          href={sourcePageUrl(paperId)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-line bg-surface px-3.5 py-2 hover:bg-subtle"
        >
          Open on {sourceName(paperId)}
        </a>
        <a
          href={sourcePdfUrl(paperId)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-line bg-surface px-3.5 py-2 hover:bg-subtle"
        >
          Open the PDF
        </a>
        <a href="/" className="rounded-lg bg-accent px-3.5 py-2 text-white hover:bg-accent-strong">
          Try another paper
        </a>
      </div>
    </div>
  )
}

const sourceName = (paperId: string) => SOURCE_NAMES[sourceOf(paperId) ?? 'arxiv']
