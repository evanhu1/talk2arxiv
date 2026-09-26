import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import GithubIcon from '../components/GithubIcon'
import { parseArxivInput } from '../lib/arxiv'

// The most-opened papers on talk2arxiv.org (Vercel request counts, Sep 2026).
const MOST_POPULAR = [
  { id: '1706.03762', title: 'Attention Is All You Need' },
  { id: '2401.02412', title: 'LLM Augmented LLMs: Expanding Capabilities through Composition' },
  { id: '2211.04325', title: 'Will we run out of data? Limits of LLM scaling based on human-generated data' },
  { id: '2312.11514', title: 'LLM in a flash: Efficient Large Language Model Inference with Limited Memory' },
  { id: '2110.11008', title: 'Optimal trading: a model predictive control approach' },
  {
    id: '2410.01727',
    title: 'Automated Knowledge Concept Annotation and Question Representation Learning for Knowledge Tracing',
  },
]

export default function Home() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const open = (event: React.FormEvent) => {
    event.preventDefault()
    const id = parseArxivInput(input)
    if (!id) {
      setError('Enter an arXiv link or ID, for example 1706.03762.')
      return
    }
    window.location.assign(`/abs/${id}`)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-end px-5">
        <a
          href="https://github.com/evanhu1/talk2arxiv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-subtle hover:text-ink"
        >
          <GithubIcon className="size-4" />
          GitHub
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[12vh] pb-16">
        <h1 className="font-serif text-[40px] leading-[1.1] font-semibold tracking-tight md:text-[52px]">
          Talk to any <span className="text-accent">arXiv</span> paper
        </h1>

        <div className="mt-8 rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="text-[15px] leading-relaxed">
            Change <code className="rounded bg-subtle px-1.5 py-0.5 text-[13.5px]">arxiv.org</code> to{' '}
            <code className="rounded bg-subtle px-1.5 py-0.5 text-[13.5px]">talk2arxiv.org</code> in any paper link.
          </p>
          <p className="mt-2 truncate font-mono text-[13px] text-muted">
            https://<span className="font-semibold text-accent">talk2</span>arxiv.org/abs/1706.03762
          </p>
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] font-semibold tracking-wider text-faint uppercase">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={open}>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors focus-within:border-faint">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setError(null)
              }}
              placeholder="Paste an arXiv link or ID"
              aria-label="arXiv link or ID"
              autoFocus
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-medium text-white hover:bg-accent-strong"
            >
              Open <ArrowRight className="size-4" />
            </button>
          </div>
          {error && <p className="mt-2 px-1 text-[13px] text-accent">{error}</p>}
        </form>

        <PaperList heading="Most popular" papers={MOST_POPULAR} />
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-6 text-[12px] text-faint">
        <span>Papers from arXiv. Thank you to arXiv for use of its open access interoperability.</span>
        <a href="https://github.com/evanhu1/talk2arxiv" target="_blank" rel="noopener noreferrer" className="hover:text-muted">
          Open source
        </a>
        <a href="https://rareui.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted">
          Components by Rare UI
        </a>
      </footer>
    </div>
  )
}

function PaperList({
  heading,
  papers,
}: {
  heading: string
  papers: { id: string; title: string }[]
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold tracking-wider text-faint uppercase">
        {heading}
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {papers.map((paper) => (
          <li key={paper.id}>
            <a href={`/abs/${paper.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-subtle">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[15.5px] font-semibold">{paper.title}</span>
                <span className="text-[12px] text-faint">arXiv:{paper.id}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
