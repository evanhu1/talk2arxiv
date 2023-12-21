"use client"
import PaperView from '../../../components/PaperViewer';
import MessageForm from '../../../components/MessageForm';
import { useState, useRef, useCallback, useEffect } from 'react';

export default function Page({ params }: { params: { paper_id: string } }) {
  const [activeComponent, setActiveComponent] = useState('messageForm');
  const messageFormRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef(false);
  const width = window.innerWidth
  const paper_id = params.paper_id;

  const handleMouseDown = useCallback(() => {
    resizeRef.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    resizeRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: any) => {
      if (resizeRef.current && messageFormRef.current) {
        const newWidth = e.clientX - messageFormRef.current.getBoundingClientRect().left;
        const messageFormWidth = Math.max(newWidth, 100); // Set a minimum width
        messageFormRef.current.style.width = `${messageFormWidth}px`;
      }
    },
    []
  );

  // Add event listeners for mouse up and mouse move
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  const toggleActiveComponent = useCallback(() => {
    setActiveComponent((current) => (current === 'messageForm' ? 'paperView' : 'messageForm'));
  }, []);

  return (
    <div className="flex sm:flex-row place-content-center space-y-1 sm:space-y-0 h-screen">
      <button
        className="sm:hidden fixed right-0 top-1/2 z-10 bg-blue-500 text-white p-2 rounded-l"
        onClick={toggleActiveComponent}
      >
        {activeComponent === 'messageForm' ? 'View Paper' : 'View Chat'}
      </button>
      {activeComponent === 'messageForm' && (
        <div
          className={`flex h-screen relative sm:top-0 flex-col mx-4 sm:place-items-center`}
          ref={messageFormRef}
          style={width > 768 ? {"width": `${600}px`} : { "width": '95%' }}
        >
          <h1 className="text-4xl font-bold my-4">Talk2Arxiv</h1>
          <MessageForm paper_id={paper_id} />
          <div
            className="w-1 cursor-ew-resize bg-gray-400 h-12 rounded my-auto absolute top-12 bottom-0 -right-2 hidden sm:block"
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
      {(width > 768 || activeComponent === 'paperView') && <PaperView paper_id={paper_id} />}
    </div>
  )
}
