"use client"
import PaperView from '../../../components/PaperViewer';
import MessageForm from '../../../components/MessageForm';
import { useState, useRef, useCallback, useEffect } from 'react';

export default function Page({ params }: { params: { paper_id: string } }) {
  const [messageFormWidth, setMessageFormWidth] = useState(600);
  const [isMessageFormVisible, setIsMessageFormVisible] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );
  const messageFormRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef(false);

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
        setMessageFormWidth(Math.max(newWidth, 100)); // Set a minimum width
      }
    },
    [setMessageFormWidth]
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

  const toggleMessageFormVisibility = useCallback(() => {
    setIsMessageFormVisible((visible) => !visible);
  }, []);

  return (
    <div className="flex flex-col md:flex-row place-content-center space-y-1 md:space-y-0 md:space-x-1 h-screen">
      <button
        className="md:hidden fixed right-0 top-1/2 z-10 bg-blue-500 text-white p-2 rounded-l"
        onClick={toggleMessageFormVisibility}
      >
        {isMessageFormVisible ? 'Close' : 'Open'}
      </button>
      <div
        className={`flex relative flex-col md:h-full mx-3 md:mx-12 place-items-center transition-transform duration-300 ${
          isMessageFormVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        ref={messageFormRef}
        style={{ width: `${messageFormWidth}px` }}
      >
        <h1 className="text-2xl md:text-4xl font-bold md:my-4">Talk2Arxiv</h1>
        <MessageForm paper_id={paper_id} />
        <div
          className="w-1 cursor-ew-resize bg-gray-400 h-12 rounded my-auto absolute top-12 bottom-0 -right-2 hidden md:block"
          onMouseDown={handleMouseDown}
        />
      </div>
      <PaperView paper_id={paper_id} />
    </div>
  )
}
