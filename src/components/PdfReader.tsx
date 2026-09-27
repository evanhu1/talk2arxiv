import { useEffect, useMemo, useState } from 'react'
import { createPluginRegistration } from '@embedpdf/core'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentContent, DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react'
import { InteractionManagerPluginPackage, PagePointerProvider } from '@embedpdf/plugin-interaction-manager/react'
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react'
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react'
import {
  SelectionLayer,
  SelectionPluginPackage,
  useSelectionCapability,
  type SelectionSelectionMenuProps,
} from '@embedpdf/plugin-selection/react'
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react'
import { ZoomMode, ZoomPluginPackage } from '@embedpdf/plugin-zoom/react'
// Serve PDFium ourselves instead of from a CDN.
import pdfiumWasm from '@embedpdf/pdfium/pdfium.wasm?url'
import SelectionToolbar from './SelectionToolbar'

interface Props {
  url: string
  onAsk: (quote: string) => void
  onExplain: (quote: string) => void
}

// Renders a PDF with EmbedPDF (PDFium compiled to WebAssembly). Text can be
// selected and sent to the chat, like in the HTML reader.
export default function PdfReader({ url, onAsk, onExplain }: Props) {
  // The engine runs in a Web Worker, which cannot resolve relative URLs.
  const { engine, error } = usePdfiumEngine({ wasmUrl: new URL(pdfiumWasm, window.location.href).href })

  const plugins = useMemo(
    () => [
      // The engine runs in a Web Worker, so the URL must be absolute. The PDF
      // route sends whole files, so skip range requests.
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: new URL(url, window.location.href).href, mode: 'full-fetch' }],
      }),
      createPluginRegistration(ViewportPluginPackage, { viewportGap: 24 }),
      createPluginRegistration(ScrollPluginPackage, { defaultPageGap: 16 }),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(ZoomPluginPackage, { defaultZoomLevel: ZoomMode.FitWidth }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(SelectionPluginPackage),
    ],
    [url],
  )

  if (error) return <Status>Could not start the PDF viewer.</Status>
  if (!engine) return <Status>Opening the PDF…</Status>

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      {({ activeDocumentId }) =>
        activeDocumentId ? (
          <DocumentContent documentId={activeDocumentId}>
            {({ isLoaded, isError }) => {
              if (isError) return <Status>Could not open this PDF.</Status>
              if (!isLoaded) return <Status>Opening the PDF…</Status>
              return <Pages documentId={activeDocumentId} onAsk={onAsk} onExplain={onExplain} />
            }}
          </DocumentContent>
        ) : (
          <Status>Opening the PDF…</Status>
        )
      }
    </EmbedPDF>
  )
}

function Pages({
  documentId,
  onAsk,
  onExplain,
}: {
  documentId: string
  onAsk: (quote: string) => void
  onExplain: (quote: string) => void
}) {
  const menu = ({ selected, menuWrapperProps, placement, rect }: SelectionSelectionMenuProps) =>
    selected ? (
      <div {...menuWrapperProps}>
        <SelectionMenu
          // A new selection gets a fresh menu, so the text below is never stale.
          key={`${rect.origin.x},${rect.origin.y},${rect.size.width},${rect.size.height}`}
          documentId={documentId}
          above={placement.suggestTop}
          onAsk={onAsk}
          onExplain={onExplain}
        />
      </div>
    ) : null

  return (
    <Viewport documentId={documentId} className="h-full bg-canvas">
      <Scroller
        documentId={documentId}
        renderPage={({ width, height, pageIndex }) => (
          // select-none: EmbedPDF selects text itself; a native selection would tint the whole page.
          <div
            style={{ width, height }}
            className="relative overflow-hidden rounded-sm bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12)] select-none"
          >
            <PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
              <RenderLayer documentId={documentId} pageIndex={pageIndex} className="pointer-events-none" />
              <SelectionLayer
                documentId={documentId}
                pageIndex={pageIndex}
                textStyle={{ background: 'rgb(250 204 21 / 0.4)' }}
                selectionMenu={menu}
              />
            </PagePointerProvider>
          </div>
        )}
      />
    </Viewport>
  )
}

function SelectionMenu({
  documentId,
  above,
  onAsk,
  onExplain,
}: {
  documentId: string
  above: boolean
  onAsk: (quote: string) => void
  onExplain: (quote: string) => void
}) {
  const { provides: selection } = useSelectionCapability()
  const [text, setText] = useState('')

  // Read the text now. Pressing a button clears the selection.
  useEffect(() => {
    selection
      ?.forDocument(documentId)
      .getSelectedText()
      .toPromise()
      .then((pages) => setText(pages.join(' ').replace(/\s+/g, ' ').trim().slice(0, 8000)))
  }, [selection, documentId])

  return (
    <SelectionToolbar
      actOnPress
      // EmbedPDF's menu wrapper has pointer-events: none. Take presses back.
      className="pointer-events-auto absolute left-1/2 -translate-x-1/2"
      style={above ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }}
      onAsk={() => {
        if (text) onAsk(text)
      }}
      onExplain={() => {
        if (text) onExplain(text)
        selection?.forDocument(documentId).clear()
      }}
      onCopy={() => navigator.clipboard.writeText(text)}
    />
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full place-items-center text-[13px] text-muted">{children}</div>
}
