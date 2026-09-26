import { useState } from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import GithubIcon from '../components/GithubIcon'
import Logo from '../components/Logo'
import { parseArxivInput } from '../lib/arxiv'
import { loadRecentPapers } from '../lib/storage'

const EXAMPLES = [
  { id: '1706.03762', title: 'Attention Is All You Need', topic: 'Transformers' },
  { id: '2106.09685', title: 'LoRA: Low-Rank Adaptation of Large Language Models', topic: 'Fine-tuning' },
  { id: '2201.11903', title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', topic: 'Reasoning' },
  { id: '2005.14165', title: 'Language Models are Few-Shot Learners', topic: 'GPT-3' },
]

export default function Home() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recent] = useState(loadRecentPapers)

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
      <header className="flex h-14 items-center justify-between px-5">
        <Logo />
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
          Talk to any <span className="text-accent">arXiv</span> paper.
        </h1>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted">
          Read the paper as clean HTML. Highlight any passage and ask about it. The assistant has read the whole paper.
        </p>

        <form onSubmit={open} className="mt-8">
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
        <p className="mt-3 px-1 text-[13px] text-muted">
          Or change <code className="rounded bg-subtle px-1.5 py-0.5 text-[12px]">arxiv.org</code> to{' '}
          <code className="rounded bg-subtle px-1.5 py-0.5 text-[12px]">talk2arxiv.org</code> in any paper link.
        </p>

        {recent.length > 0 && (
          <PaperList
            heading="Recent"
            papers={recent.map((p) => ({ ...p, topic: null }))}
            icon={<Clock className="size-3.5" />}
          />
        )}
        <PaperList heading="Try a classic" papers={EXAMPLES} />
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-6 text-[12px] text-faint">
        <span>Papers from arXiv. Thank you to arXiv for use of its open access interoperability.</span>
        <a href="https://github.com/evanhu1/talk2arxiv" target="_blank" rel="noopener noreferrer" className="hover:text-muted">
          Open source
        </a>
        <a
          href="https://rareui.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] opacity-40 transition-opacity hover:opacity-100"
        >
          Components by Rare UI
        </a>
      </footer>
    </div>
  )
}

function PaperList({
  heading,
  papers,
  icon,
}: {
  heading: string
  papers: { id: string; title: string; topic: string | null }[]
  icon?: React.ReactNode
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold tracking-wider text-faint uppercase">
        {icon}
        {heading}
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {papers.map((paper) => (
          <li key={paper.id}>
            <a href={`/abs/${paper.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-subtle">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[15.5px] font-semibold">{paper.title}</span>
                <span className="text-[12px] text-faint">
                  arXiv:{paper.id}
                  {paper.topic && ` · ${paper.topic}`}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
