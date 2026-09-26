import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Sparkles } from 'lucide-react'
import type { Paper } from '../../shared/types'
import ChatPanel from '../components/ChatPanel'
import PaperView, { type OutlineItem } from '../components/PaperView'
import SelectionPopover from '../components/SelectionPopover'
import TopBar from '../components/TopBar'
import ProximitySidebar, { type ProximitySection } from '../components/ui/proximity-sidebar'
import ScrollProgress from '../components/ui/scroll-progress'
import { clearQuoteHighlight, showQuoteHighlight } from '../lib/selection'
import { loadNumber, saveNumber } from '../lib/storage'
import { useChat } from '../lib/useChat'
import { useMediaQuery } from '../lib/useMediaQuery'

const DESKTOP = '(min-width: 768px)'
const CHAT_WIDTH_KEY = 'talk2arxiv:chat-width'
// Past this many entries, the sidebar lists only top-level sections.
// Subsections stay reachable from the section pill's menu.
const MINIMAP_LIMIT = 30
// The paper stays centered on the page, not just in the space left of the chat.
// While the chat is open, a left inset pushes the paper toward the page center,
// but never so far that the paper gets narrower.
// Widths match PaperView: max-w-[860px] with md:px-8.
const PAPER_MAX_WIDTH = 860
const PAPER_GUTTER = 32
// The sidebar shows only dashes in the left margin until the pointer is on it.
const SIDEBAR_WIDTH = 76

export default function PaperPage({ paperId }: { paperId: string }) {
  const chat = useChat(paperId)
  const isDesktop = useMediaQuery(DESKTOP)
  const [chatOpen, setChatOpen] = useState(() => window.matchMedia(DESKTOP).matches)
  const [chatWidth, setChatWidth] = useState(() => loadNumber(CHAT_WIDTH_KEY, 440))
  const [paper, setPaper] = useState<Paper | null>(null)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [quote, setQuote] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLElement>(null)
  const articleRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const minimap = useMemo(() => toMinimap(outline), [outline])
  const { inset, showSidebar } = paperLayout(useWindowWidth(), chatOpen && isDesktop ? chatWidth : 0)

  useEffect(() => {
    if (!paper) return
    document.title = `Talk to ${paper.title}`
  }, [paper])

  const onLoaded = useCallback((loaded: Paper, items: OutlineItem[]) => {
    setPaper(loaded)
    setOutline(items)
    // Honor a #section link now that the section exists.
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [])

  const clearQuote = useCallback(() => {
    setQuote(null)
    clearQuoteHighlight()
  }, [])

  const askAbout = useCallback((text: string, range: Range) => {
    setQuote(text)
    showQuoteHighlight(range)
    setChatOpen(true)
    requestAnimationFrame(() => composerRef.current?.focus())
  }, [])

  const explain = useCallback(
    (text: string, range: Range) => {
      // One answer at a time. Keep the passage ready in the composer instead.
      if (chat.streaming) {
        askAbout(text, range)
        return
      }
      clearQuote()
      setChatOpen(true)
      chat.send('Explain this passage in simple terms.', text)
    },
    [chat, clearQuote, askAbout],
  )

  const send = useCallback(
    (text: string) => {
      chat.send(text, quote ?? undefined)
      clearQuote()
    },
    [chat, quote, clearQuote],
  )

  const chatPanel = (
    <ChatPanel
      chat={chat}
      quote={quote}
      onClearQuote={clearQuote}
      onSend={send}
      composerRef={composerRef}
    />
  )

  return (
    // Only the paper and the chat scroll. overflow-clip (not hidden) so that
    // anchor jumps cannot scroll this box and push the top bar off screen.
    <div className="flex h-dvh flex-col overflow-clip">
      <TopBar
        paperId={paperId}
        title={paper?.title ?? null}
        chatOpen={chatOpen}
        onChatOpenChange={setChatOpen}
        compact={!isDesktop}
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 overflow-clip">
          <main ref={scrollerRef} className="h-full overflow-y-auto">
            <div style={{ paddingLeft: inset }}>
              <PaperView paperId={paperId} articleRef={articleRef} onLoaded={onLoaded} />
            </div>
          </main>
          {minimap.length > 0 && showSidebar && (
            // pointer-events-none: wheel scrolling over the empty margin reaches the paper.
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10">
              <ProximitySidebar sections={minimap} activeOffset={0.25} labels="hover" />
            </div>
          )}
          {outline.length > 0 && (
            <ScrollProgress
              sections={outline}
              containerRef={scrollerRef}
              style={{ left: `calc(50% + ${inset / 2}px)` }}
              className="absolute bottom-5 z-20 max-w-[calc(100%-2rem)] text-ink"
            />
          )}
        </div>

        {chatOpen && isDesktop && (
          <>
            <ResizeHandle
              width={chatWidth}
              onResize={setChatWidth}
              onDone={(width) => saveNumber(CHAT_WIDTH_KEY, width)}
            />
            <aside style={{ width: chatWidth }} className="shrink-0 border-l border-line">
              {chatPanel}
            </aside>
          </>
        )}
      </div>

      {chatOpen && !isDesktop && <div className="fixed inset-x-0 top-12 bottom-0 z-40">{chatPanel}</div>}

      {!chatOpen && isDesktop && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="animate-pop-in fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-[14px] font-medium text-white shadow-lg hover:bg-accent-strong"
        >
          <Sparkles className="size-4" />
          Ask AI
        </button>
      )}

      <SelectionPopover containerRef={articleRef} scrollerRef={scrollerRef} onAsk={askAbout} onExplain={explain} />
    </div>
  )
}

function ResizeHandle({
  width,
  onResize,
  onDone,
}: {
  width: number
  onResize: (width: number) => void
  onDone: (width: number) => void
}) {
  const [dragging, setDragging] = useState(false)
  const clamp = (value: number) => Math.round(Math.min(Math.max(value, 340), Math.min(760, window.innerWidth * 0.6)))

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onResize(clamp(width + 24))
        if (e.key === 'ArrowRight') onResize(clamp(width - 24))
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (dragging) onResize(clamp(window.innerWidth - e.clientX))
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDragging(false)
        onDone(width)
      }}
      className="group relative z-10 -mr-1 w-1 shrink-0 cursor-col-resize outline-none"
    >
      <div
        className={`absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 transition-colors ${
          dragging ? 'bg-accent/50' : 'group-hover:bg-accent/30 group-focus-visible:bg-accent/50'
        }`}
      />
    </div>
  )
}

// Top-level sections get long, dark dashes and subsections short, light ones.
function toMinimap(outline: OutlineItem[]): ProximitySection[] {
  const items = outline.length > MINIMAP_LIMIT ? outline.filter((item) => item.level === 1) : outline
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    kind: item.level === 1 ? 'subtitle' : 'section',
  }))
}

// The paper column spans from the page's left edge to the chat. An inset equal
// to the chat's width puts the paper's center at the page's center. When the
// full-width paper does not fit that way, the inset shrinks instead of the paper.
function paperLayout(pageWidth: number, chatWidth: number) {
  const columnWidth = pageWidth - chatWidth
  const inset = Math.max(0, Math.min(chatWidth, columnWidth - PAPER_MAX_WIDTH))
  const available = columnWidth - inset
  const paperWidth = Math.min(available, PAPER_MAX_WIDTH) - 2 * PAPER_GUTTER
  const paperLeft = inset + (available - paperWidth) / 2
  return { inset, showSidebar: paperLeft >= SIDEBAR_WIDTH }
}

function useWindowWidth() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange)
      return () => window.removeEventListener('resize', onChange)
    },
    () => window.innerWidth,
  )
}
