import React, { useEffect, useRef } from 'react';
import { Message } from '../utils/types';
import { User, Sparkles } from 'lucide-react';

interface MessagesDisplayProps {
  messages: Message[];
}

const MessagesDisplay: React.FC<MessagesDisplayProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto scrollbar px-5 py-5 space-y-5">
      {messages.map((msg: Message, index: number) => (
        <div
          key={index}
          className={`flex gap-3 animate-slide-up ${
            msg.sender === 'user' ? 'flex-row-reverse' : ''
          }`}
          style={{ animationDelay: `${Math.min(index * 30, 200)}ms`, animationFillMode: 'backwards' }}
        >
          {/* Avatar */}
          <div
            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
              msg.sender === 'user'
                ? 'bg-accent/12 text-accent'
                : 'bg-surface-3 text-text-tertiary'
            }`}
          >
            {msg.sender === 'user'
              ? <User className="w-3 h-3" />
              : <Sparkles className="w-3 h-3" />
            }
          </div>

          {/* Bubble */}
          <div className={`max-w-[82%] ${msg.sender === 'user' ? 'text-right' : ''}`}>
            <span className={`text-[10px] font-medium uppercase tracking-wider mb-1 block ${
              msg.sender === 'user' ? 'text-accent/50 mr-1' : 'text-text-tertiary ml-1'
            }`}>
              {msg.sender === 'user' ? 'You' : 'Assistant'}
            </span>
            <div
              className={`inline-block text-[13px] leading-[1.7] px-4 py-2.5 ${
                msg.sender === 'user'
                  ? 'bg-accent/8 text-text-primary rounded-2xl rounded-tr-md border border-accent/10'
                  : 'bg-surface-2 text-text-primary/90 rounded-2xl rounded-tl-md border border-border'
              }`}
            >
              <p className="whitespace-pre-wrap text-left">{msg.text}</p>
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessagesDisplay;
