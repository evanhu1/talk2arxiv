import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function MobileComposer({ value, onChange, onSend, disabled }: {
  value: string
  onChange: (value: string) => void
  onSend: (value: string) => void
  disabled: boolean
}) {
  const [keyboardInset, setKeyboardInset] = useState(0)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop))
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update) }
  }, [])
  return (
    <form
      onSubmit={(event) => { event.preventDefault(); if (value.trim() && !disabled) onSend(value) }}
      style={{ bottom: `calc(${keyboardInset}px + max(16px, env(safe-area-inset-bottom)))` }}
      className="fixed inset-x-4 z-30 flex min-h-14 items-center gap-2 rounded-full border border-white/40 bg-surface/75 py-2 pr-2 pl-3 shadow-[0_8px_32px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-xl dark:border-white/10"
    >
      <input
        aria-label="Ask about this paper"
        placeholder="Ask about this paper…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        enterKeyHint="send"
        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[16px] outline-none placeholder:text-muted"
      />
      {value.trim() && <button type="submit" aria-label="Send question" disabled={disabled} className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white disabled:opacity-40"><ArrowUp className="size-5" /></button>}
    </form>
  )
}
