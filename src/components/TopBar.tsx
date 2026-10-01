import { ExternalLink, MessageSquareText } from 'lucide-react'
import { displayId, SOURCE_NAMES, sourceOf, sourcePageUrl, sourcePdfUrl } from '../../shared/papers'
import GithubIcon from './GithubIcon'
import HelpButton from './HelpButton'

interface Props {
  paperId: string
  title: string | null
  chatOpen: boolean
  onChatOpenChange: (open: boolean) => void
  // Phones open chat in a bottom sheet.
  compact: boolean
}

export default function TopBar({ paperId, title, chatOpen, onChatOpenChange, compact }: Props) {
  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] font-semibold" title={title ?? undefined}>
          {title ?? 'Loading…'}
        </p>
        <p className="truncate text-[11px] leading-tight text-faint">{displayId(paperId)}</p>
      </div>

      <HelpButton className="-mr-1" />

      {compact ? (
        // The reader stays behind the mobile chat sheet.
        <button
          type="button"
          onClick={() => onChatOpenChange(!chatOpen)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[14px] font-medium text-white hover:bg-accent-strong"
        >
          <MessageSquareText className="size-4" />
          Chat
        </button>
      ) : (
        <nav className="flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-muted">
          <a
            href={sourcePageUrl(paperId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 hover:bg-subtle hover:text-ink"
          >
            {SOURCE_NAMES[sourceOf(paperId) ?? 'arxiv']} <ExternalLink className="size-3" />
          </a>
          <a
            href={sourcePdfUrl(paperId)}
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
