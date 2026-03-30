"use client"
import PaperView from '../../../components/PaperViewer';
import MessageForm from '../../../components/MessageForm';
import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

export default function Page({ params }: { params: { paper_id: string } }) {
  const [activeView, setActiveView] = useState<'chat' | 'paper'>('chat');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chatWidth, setChatWidth] = useState(520);
  const [dragging, setDragging] = useState(false);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const paper_id = params.paper_id;

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!chatPanelRef.current) return;
      const left = chatPanelRef.current.getBoundingClientRect().left;
      setChatWidth(Math.max(360, Math.min(e.clientX - left, window.innerWidth * 0.55)));
    };

    const onMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  if (!mounted) return null;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col bg-surface-0">
        <div className="flex shrink-0 border-b border-border bg-surface-1">
          {(['chat', 'paper'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex-1 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeView === view
                  ? 'text-accent border-b border-accent'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {view === 'chat' ? 'Chat' : 'Paper'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          {activeView === 'chat' ? (
            <MessageForm paper_id={paper_id} />
          ) : (
            <PaperView paper_id={paper_id} />
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen bg-surface-0 animate-fade-in">
      {/* Chat panel */}
      <div
        ref={chatPanelRef}
        className="h-full flex flex-col shrink-0 border-r border-border bg-surface-1"
        style={{ width: chatWidth }}
      >
        <MessageForm paper_id={paper_id} />
      </div>

      {/* Full-screen overlay while dragging to capture all mouse events */}
      {dragging && <div className="fixed inset-0 z-50 cursor-ew-resize" />}

      {/* Drag handle */}
      <div
        className={`w-[3px] shrink-0 relative cursor-ew-resize group ${dragging ? 'bg-accent/20' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-0 w-4 -left-[7px] z-10" />
        <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <GripVertical className="w-3.5 h-3.5 text-text-tertiary" />
        </div>
        <div className={`absolute inset-0 transition-colors ${dragging ? 'bg-accent/20' : 'bg-transparent group-hover:bg-accent/10'}`} />
      </div>

      {/* PDF panel */}
      <div className="flex-1 min-w-0 h-full">
        <PaperView paper_id={paper_id} />
      </div>
    </div>
  );
}
