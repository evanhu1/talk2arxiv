import type { ReactNode } from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'

// Vaul supplies dragging, focus trapping, dismissal, and keyboard handling.
export default function BottomSheet({ open, onOpenChange, title, children, hideTitle = false }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  hideTitle?: boolean
  children: ReactNode
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} handleOnly repositionInputs fixed>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[70] flex h-auto max-h-[min(70dvh,640px)] flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface text-ink shadow-2xl outline-none"
        >
          <div className={`relative shrink-0 px-5 ${hideTitle ? 'py-5' : 'pt-3 pb-3'}`}>
            <Drawer.Handle className={`mx-auto h-1.5 w-10 rounded-full bg-line ${hideTitle ? '' : 'mb-4'}`} />
            <Drawer.Title className={hideTitle ? 'sr-only' : 'pr-10 text-[14px] font-medium'}>{title}</Drawer.Title>
            <Drawer.Close aria-label="Close sheet" className="absolute right-3 bottom-1.5 grid size-9 place-items-center rounded-full text-muted hover:bg-subtle">
              <X className="size-4" />
            </Drawer.Close>
          </div>
          <div className="flex min-h-0 flex-auto flex-col pb-[env(safe-area-inset-bottom)]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
