import React, { useEffect, useRef } from 'react';
import { Message } from '../utils/types';

interface MessagesDisplayProps {
  messages: Message[];
}

const MessagesDisplay: React.FC<MessagesDisplayProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    console.log(messagesEndRef.current)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  return (
    <div className="overflow-y-auto mb-4 h-full scrollbar pr-2">
      {messages.map((msg: Message, index: any) => (
        <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}>
          <span className={`text-xs ${msg.sender === 'user' ? 'text-blue-500' : 'text-green-500'}`}>{msg.sender === 'user' ? 'User' : 'bot'}</span>
          <div className={`text-left mb-2 ${msg.sender === 'user' ? 'text-blue-300 bg-blue-900' : 'text-green-300 bg-green-900'} p-2 rounded`}>
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )};

export default MessagesDisplay;
