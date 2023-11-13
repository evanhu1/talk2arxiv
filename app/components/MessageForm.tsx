import React, { useState, useEffect, useRef } from 'react';
import MessagesDisplay from './MessageList';

enum LLMStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

const MessageForm = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [llmStatus, setLlmStatus] = useState(LLMStatus.IDLE);

  const getBotReply = async (userMessage: string) => {
    setLlmStatus(LLMStatus.LOADING);
    await new Promise(resolve => setTimeout(resolve, 1));
    setLlmStatus(LLMStatus.SUCCESS);
    return 'Random reply: ' + Math.random().toString(36).substring(7);
  }

  const handleSubmit = async (e: any) => {
    console.log(message)
    console.log(message.trim() != "" && (llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS))
    if (message.trim() && (llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS)) {
      setMessages(messages => [...messages, { text: message, sender: 'user' }]);
      setMessage('');
      const reply = await getBotReply(message);
      console.log(llmStatus);
      if (llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS) {
        setMessages(messages => [...messages, { text: reply, sender: 'bot' }]);
      }
    }
  };

  const handleEnter = (e: any) => {
    if (e.key === 'Enter' ) {
      console.log(message);
      if (messageInputRef.current && messageInputRef.current === document.activeElement) {
        handleSubmit(e);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleEnter)
    return () => {
      window.removeEventListener('keydown', handleEnter);
    };
  }, []);

  const messageInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="rounded shadow-lg p-4 bg-gray-800 w-full h-full flex flex-col mb-12">
      <MessagesDisplay messages={messages} />
      <div className="mt-auto relative">
        {llmStatus === LLMStatus.LOADING && (
          <div className="flex justify-center items-center absolute m-auto left-0 right-0 -top-6">
            <div className="animate-pulse text-sm">Thinking...</div>
          </div>
        )}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="p-2 w-full bg-gray-700 text-white rounded outline-none"
          placeholder="Type your message here..."
          ref={messageInputRef}
        />
        <button type="submit" className="bg-blue-600 text-white p-2 mt-2 w-full rounded" onClick={handleSubmit}>
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageForm;
