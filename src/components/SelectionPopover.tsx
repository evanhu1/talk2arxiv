import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, Copy, Lightbulb, Sparkles } from 'lucide-react'
import { rangeToQuote } from '../lib/selection'

interface Props {
  containerRef: RefObject<HTMLElement | null>
  scrollerRef: RefObject<HTMLElement | null>
  onAsk: (quote: string, range: Range) => void
  onExplain: (quote: string, range: Range) => void
}

interface Selected {
  range: Range
  rect: DOMRect
}

// A small toolbar that appears over text the reader selects in the paper.
export default function SelectionPopover({ containerRef, scrollerRef, onAsk, onExplain }: Props) {
  const [selected, setSelected] = useState<Selected | null>(null)
  const [copied, setCopied] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let pointerDown = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const evaluate = () => {
      const selection = window.getSelection()
      const container = containerRef.current
      if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !container) {
        setSelected(null)
        return
      }
      const range = selection.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer) || selection.toString().trim().length < 2) {
        setSelected(null)
        return
      }
      setCopied(false)
      setSelected({ range: range.cloneRange(), rect: range.getBoundingClientRect() })
    }

    const onPointerDown = (event: PointerEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return
      pointerDown = true
      setSelected(null)
    }
    const onPointerUp = () => {
      if (!pointerDown) return
      pointerDown = false
      setTimeout(evaluate, 0)
    }
    // Keyboard and touch selections do not end with a mouse pointerup.
    const onSelectionChange = () => {
      if (pointerDown) return
      clearTimeout(timer)
      timer = setTimeout(evaluate, 250)
    }
    const reposition = () =>
      setSelected((current) => current && { range: current.range, rect: current.range.getBoundingClientRect() })

    const scroller = scrollerRef.current
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('selectionchange', onSelectionChange)
    scroller?.addEventListener('scroll', reposition, { passive: true })
    window.addEventListener('resize', reposition)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('selectionchange', onSelectionChange)
      scroller?.removeEventListener('scroll', reposition)
      window.removeEventListener('resize', reposition)
    }
  }, [containerRef, scrollerRef])

  if (!selected) return null

  const { rect } = selected
  const bounds = scrollerRef.current?.getBoundingClientRect()
  if (bounds && (rect.bottom < bounds.top || rect.top > bounds.bottom)) return null

  // Touch devices show their own menu above the selection, so go below it.
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const above = !coarse && rect.top - 52 > (bounds?.top ?? 0)
  const left = Math.min(Math.max(rect.left + rect.width / 2, 140), window.innerWidth - 140)
  const top = above ? rect.top - 48 : rect.bottom + 10

  const finish = () => {
    window.getSelection()?.removeAllRanges()
    setSelected(null)
  }

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Selection actions"
      onPointerDown={(e) => e.preventDefault()}
      style={{ left, top }}
      className="animate-pop-in fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-line bg-surface p-1 text-[13px] font-medium shadow-[0_8px_30px_rgb(0_0_0/0.12)]"
    >
      <button
        type="button"
        onClick={() => {
          onAsk(rangeToQuote(selected.range), selected.range)
          finish()
        }}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-white hover:bg-accent-strong"
      >
        <Sparkles className="size-3.5" />
        Ask AI
      </button>
      <button
        type="button"
        onClick={() => {
          onExplain(rangeToQuote(selected.range), selected.range)
          finish()
        }}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ink hover:bg-subtle"
      >
        <Lightbulb className="size-3.5" />
        Explain
      </button>
      <button
        type="button"
        title="Copy"
        aria-label="Copy"
        onClick={() => {
          navigator.clipboard.writeText(rangeToQuote(selected.range)).then(() => setCopied(true))
        }}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
