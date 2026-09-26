import { ExternalLink, FileText, MessageSquareText } from 'lucide-react'
import { absUrl, pdfUrl } from '../lib/arxiv'
import { useThemeColor } from '../lib/useThemeColor'
import GithubIcon from './GithubIcon'
import { GooeyNav } from './ui/gooey-nav'

interface Props {
  paperId: string
  title: string | null
  chatOpen: boolean
  onChatOpenChange: (open: boolean) => void
  // Phones switch between the paper and the chat instead of showing both.
  compact: boolean
}

export default function TopBar({ paperId, title, chatOpen, onChatOpenChange, compact }: Props) {
  const accent = useThemeColor('--accent')

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] font-semibold" title={title ?? undefined}>
          {title ?? 'Loading…'}
        </p>
        <p className="truncate text-[11px] leading-tight text-faint">arXiv:{paperId}</p>
      </div>

      {compact ? (
        <GooeyNav
          items={[
            { label: 'Paper', icon: <FileText /> },
            { label: 'Chat', icon: <MessageSquareText /> },
          ]}
          value={chatOpen ? 1 : 0}
          onChange={(index) => onChatOpenChange(index === 1)}
          size="xs"
          activeColor={accent}
          className="shrink-0"
        />
      ) : (
        <nav className="flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-muted">
          <a
            href={absUrl(paperId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 hover:bg-subtle hover:text-ink"
          >
            arXiv <ExternalLink className="size-3" />
          </a>
          <a
            href={pdfUrl(paperId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 hover:bg-subtle hover:text-ink"
          >
            PDF <ExternalLink className="size-3" />
          </a>
          <a
            href="https://github.com/evanhu1/talk2arxiv"
            target="_blank"
            rel="noopener noreferrer"
            title="Source on GitHub"
            aria-label="Source on GitHub"
            className="grid size-8 place-items-center rounded-lg hover:bg-subtle hover:text-ink"
          >
            <GithubIcon className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => onChatOpenChange(!chatOpen)}
            aria-pressed={chatOpen}
            className={`ml-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              chatOpen ? 'bg-accent-soft text-accent' : 'bg-accent text-white hover:bg-accent-strong'
            }`}
          >
            <MessageSquareText className="size-4" />
            Chat
          </button>
        </nav>
      )}
    </header>
  )
}
