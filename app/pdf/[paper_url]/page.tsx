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

  const paperId = window.location.pathname.substring(1);
  console.log(paperId)

  return (
    <div className="flex text-center flex-col">
      <div className="flex flex-row place-content-center space-x-1">
        <div className="flex flex-row relative">
          <div
            className="flex flex-col mx-12"
            ref={messageFormRef}
            style={{ width: `${messageFormWidth}px` }}
          >
            <h1 className="text-4xl font-bold my-6">Talk2Arxiv</h1>
            <MessageForm />
          </div>
          <div
            className="w-1 cursor-ew-resize bg-gray-400 h-12 rounded my-auto absolute top-0 bottom-0 right-10"
            onMouseDown={handleMouseDown}
          />
        </div>
        
        <PaperView url={`https://arxiv.org/${paperId}`}/>
      </div>
    </div>
  )
}
