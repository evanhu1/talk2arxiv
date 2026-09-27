import { useRef } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { currentSite } from '../lib/site'

const SITES = {
  arxiv: { name: 'Talk2Arxiv', source: 'arXiv', from: 'arxiv.org', to: 'talk2arxiv.org' },
  biorxiv: { name: 'Talk2bioRxiv', source: 'bioRxiv', from: 'biorxiv.org', to: 'talk2biorxiv.org' },
}

// A "?" button that opens a short explanation of the app and how to use it.
export default function HelpButton({ className = '' }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const site = SITES[currentSite()]

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        title="How this works"
        aria-label="How this works"
        className={`grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink ${className}`}
      >
        <CircleHelp className="size-[18px]" />
      </button>

      <dialog
        ref={dialogRef}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
        className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-[22px] leading-tight font-semibold">What is {site.name}?</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="-mt-1 -mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Read any {site.source} paper and ask an AI that has read all of it.
          </p>

          <ol className="mt-5 space-y-3 text-[14px] leading-relaxed">
            <Step n={1} title="Open a paper.">
              In any paper link, change <Code>{site.from}</Code> to <Code>{site.to}</Code>. Or paste the link on the
              home page.
            </Step>
            <Step n={2} title="Highlight a passage.">
              Then tap <strong className="font-medium">Ask AI</strong> or{' '}
              <strong className="font-medium">Explain</strong>.
            </Step>
            <Step n={3} title="Ask anything.">
              Use the chat. On a phone, tap <strong className="font-medium">Chat</strong> at the top.
            </Step>
            <Step n={4} title="Jump to a section.">
              Use the pill at the bottom of the paper.
            </Step>
          </ol>

          <p className="mt-5 text-[12px] leading-relaxed text-faint">
            Answers come from GPT-6 Luna and can be wrong. Your chats stay in this browser.
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="mt-5 w-full rounded-xl bg-accent py-2.5 text-[14px] font-medium text-white hover:bg-accent-strong"
          >
            Got it
          </button>
        </div>
      </dialog>
    </>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
        {n}
      </span>
      <span>
        <strong className="font-semibold">{title}</strong> {children}
      </span>
    </li>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[12.5px]">{children}</code>
}
