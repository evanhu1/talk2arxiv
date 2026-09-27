import { forwardRef, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, Copy, Lightbulb, Sparkles } from 'lucide-react'

interface Props {
  onAsk: () => void
  onExplain: () => void
  // Resolves once the text is on the clipboard.
  onCopy: () => Promise<void>
  style?: CSSProperties
  className?: string
  // Act on press instead of click. The PDF reader clears its selection (and
  // removes this toolbar) on press and stops the event, so neither a click
  // nor React's own pointer handlers would ever run.
  actOnPress?: boolean
}

type Action = 'ask' | 'explain' | 'copy'

// Ask AI / Explain / Copy for selected text. Used over HTML papers
// (SelectionPopover) and PDF papers (PdfReader).
const SelectionToolbar = forwardRef<HTMLDivElement, Props>(function SelectionToolbar(
  { onAsk, onExplain, onCopy, style, className = '', actOnPress = false },
  ref,
) {
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const actions = useRef<Record<Action, () => void>>({ ask: onAsk, explain: onExplain, copy: () => {} })
  actions.current = {
    ask: onAsk,
    explain: onExplain,
    copy: () => {
      onCopy().then(() => setCopied(true))
    },
  }

  // A capture listener on window runs before anything on the page can stop the press.
  useEffect(() => {
    if (!actOnPress) return
    const onPress = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest?.('button[data-action]')
      if (!button || !rootRef.current?.contains(button)) return
      event.preventDefault()
      event.stopPropagation()
      actions.current[button.getAttribute('data-action') as Action]()
    }
    window.addEventListener('pointerdown', onPress, { capture: true })
    return () => window.removeEventListener('pointerdown', onPress, { capture: true })
  }, [actOnPress])

  const setRoot = (el: HTMLDivElement | null) => {
    rootRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  // Keyboard activation (detail === 0) always comes through click.
  const onClick = (action: Action) => (event: React.MouseEvent) => {
    if (!actOnPress || event.detail === 0) actions.current[action]()
  }

  return (
    <div
      ref={setRoot}
      role="toolbar"
      aria-label="Selection actions"
      // Keep the selection when a button is pressed.
      onPointerDown={(e) => e.preventDefault()}
      style={style}
      className={`animate-pop-in z-50 flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1 font-sans text-[13px] font-medium whitespace-nowrap shadow-[0_8px_30px_rgb(0_0_0/0.12)] ${className}`}
    >
      <button
        type="button"
        data-action="ask"
        onClick={onClick('ask')}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-white hover:bg-accent-strong"
      >
        <Sparkles className="size-3.5" />
        Ask AI
      </button>
      <button
        type="button"
        data-action="explain"
        onClick={onClick('explain')}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ink hover:bg-subtle"
      >
        <Lightbulb className="size-3.5" />
        Explain
      </button>
      <button
        type="button"
        title="Copy"
        aria-label="Copy"
        data-action="copy"
        onClick={onClick('copy')}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
})

export default SelectionToolbar
