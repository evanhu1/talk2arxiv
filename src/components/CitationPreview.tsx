import { useEffect, useId, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ExternalLink, LoaderCircle, MessageSquareText, X } from 'lucide-react'
import type { Citation } from '../../shared/types'
import type { CitationHit } from '../lib/citations'
import BottomSheet from './ui/BottomSheet'

export default function CitationPreview({ hit, paperId, mobile, onClose, onAsk }: {
  hit: CitationHit
  paperId: string
  mobile: boolean
  onClose: () => void
  onAsk: (citation: Citation) => void
}) {
  const [citation, setCitation] = useState<Citation | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const titleId = useId()
  useEffect(() => {
    const controller = new AbortController()
    setCitation(null)
    setError('')
    const query = new URLSearchParams({ paperId, referenceId: hit.referenceId })
    fetch(`/api/citation?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? 'Could not look up this reference.')
        return body as Citation
      })
      .then(setCitation)
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [paperId, hit.referenceId, attempt])

  const content = (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 overflow-y-auto px-5 pt-2 pb-5">
        <h2 id={titleId} className="pr-4 font-serif text-xl leading-snug font-semibold">{citation?.title ?? hit.title}</h2>
        {citation?.authors.length ? <p className="mt-2 text-[13px] leading-relaxed text-muted">{citation.authors.join(', ')}</p> : null}
        {citation?.abstract ? (
          <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed">{citation.abstract}</p>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{hit.referenceText}</p>
        )}
        {!citation && !error && <p role="status" className="mt-4 flex items-center gap-2 text-[13px] text-muted"><LoaderCircle className="size-4 animate-spin" />Looking up this paper…</p>}
        {error && <p role="alert" className="mt-4 text-[13px] text-muted">{error} <button className="text-accent underline" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p>}
        {citation && !citation.paperId && <p className="mt-4 text-[12px] text-muted">{citation.abstract ? 'Only the abstract is available for chat.' : 'The text of this paper is not available for chat.'}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-line px-5 py-4">
        <button
          type="button"
          disabled={!citation || (!citation.paperId && !citation.abstract)}
          onClick={() => citation && onAsk(citation)}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-medium text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageSquareText className="size-4" />Ask about this paper
        </button>
        {citation?.url && <a href={citation.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-muted hover:text-ink">Open paper <ExternalLink className="size-3" /></a>}
      </div>
    </div>
  )

  if (mobile) return <BottomSheet open onOpenChange={(open) => { if (!open) onClose() }} title="Cited paper">{content}</BottomSheet>
  return (
    <Popover.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Popover.Anchor virtualRef={{ current: hit.anchor }} />
      <Popover.Portal>
        <Popover.Content
          aria-labelledby={titleId}
          side="bottom" align="start" sideOffset={10} collisionPadding={16}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="z-[60] flex max-h-[min(560px,var(--radix-popover-content-available-height))] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface pt-5 text-ink shadow-[0_12px_50px_rgb(0_0_0/0.16)] outline-none"
        >
          <Popover.Close aria-label="Close citation" className="absolute top-2 right-2 grid size-7 place-items-center rounded-full text-muted hover:bg-subtle"><X className="size-4" /></Popover.Close>
          {content}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
