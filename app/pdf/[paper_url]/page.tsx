"use client"
import PaperView from '../../components/PaperViewer';
import MessageForm from '../../components/MessageForm';
import { useState, useRef, useCallback, useEffect } from 'react';

export default function Home() {
  const [messageFormWidth, setMessageFormWidth] = useState(400);
  const messageFormRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef(false);

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

  return (
    <div className="flex flex-col md:flex-row place-content-center space-y-1 md:space-y-0 md:space-x-1 md:h-screen">
      <div
        className="flex relative flex-col md:h-full mx-3 md:mx-12 place-items-center"
        ref={messageFormRef}
        style={{ width: `${messageFormWidth}px` }}
      >
        <h1 className="text-2xl md:text-4xl font-bold md:my-4">Talk2Arxiv</h1>
        <MessageForm />
        <div
          className="w-1 cursor-ew-resize bg-gray-400 h-12 rounded my-auto absolute top-12 bottom-0 -right-2 hidden md:block"
          onMouseDown={handleMouseDown}
        />
      </div>
      <PaperView />
    </div>
  )
}
