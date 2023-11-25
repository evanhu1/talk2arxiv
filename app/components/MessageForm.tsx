/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import MessagesDisplay from './MessageList';
import OpenAI from "openai";
import { Message, LLMStatus } from "../../utils/types";
import { constructPrompt } from "../../utils/llmtools";

const MessageForm = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [llmStatus, setLlmStatus] = useState(LLMStatus.IDLE);
  const [openAIKey, setOpenAIKey] = useState('');
  const GROBID_URL = 'http://localhost:8070/api/';

  const memoizedOpenAI = useMemo(() => {
    return new OpenAI({apiKey: openAIKey, dangerouslyAllowBrowser: true });
  }, [openAIKey]);
  
  useEffect(() => {
    const cachedApiKey = localStorage.getItem('OPENAI_API_KEY');
    if (cachedApiKey) {
      setOpenAIKey(cachedApiKey);
    }
    const id = window.location.pathname.substring(1);
    const savedMessages = localStorage.getItem(id);

    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    const id = window.location.pathname.substring(1);
    localStorage.setItem(id, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const loadMessagesAndEmbedPDF = async () => {
      setLlmStatus(LLMStatus.LOADING);
      const id = window.location.pathname.substring(1);
      
      try {
        const response = await fetch(GROBID_URL + '/embeddings/insert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ "pdfId": id }),
        });
        await response.json();
      } catch (err) {
        console.error(err);
      }

      setLlmStatus(LLMStatus.IDLE);
    };

    loadMessagesAndEmbedPDF();
  }, []);

  const getBotReply = async (message: string) => {
    setLlmStatus(LLMStatus.THINKING);
    const prompt = await constructPrompt(message, messages);

    if (prompt === "") {
      setLlmStatus(LLMStatus.ERROR);
      return "Embedding server is down. Please try again later."
    }
    
    console.log(prompt);
    const completion = await memoizedOpenAI.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0,
    })
    .then((res) => {
      setLlmStatus(LLMStatus.SUCCESS);
      return res.choices[0].message.content
    })
    .catch((err) => {
      setLlmStatus(LLMStatus.ERROR);
      return err.toString();
    });
    
    return completion;
  }

  const handleSubmit = async (e: any) => {
    if (message.trim() && (llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS || llmStatus === LLMStatus.ERROR)) {
      setMessages(messages => [...messages, { text: message, sender: 'user' }]);
      setMessage('');

      const reply = await getBotReply(message);
      if (llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS || llmStatus === LLMStatus.ERROR) {
        setMessages(messages => [...messages, { text: reply, sender: 'bot' }]);
      }
    }
  };

  document.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && messageInputRef.current === document.activeElement) {
      const selection = window.getSelection();
      console.log(selection?.toString());
      handleSubmit(e as unknown as React.MouseEvent<HTMLButtonElement, MouseEvent>);
    }
  };

  const messageInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className={`rounded shadow-lg p-4 bg-gray-800 mb-4 w-full min-h-0 flex-shrink flex flex-col ${llmStatus === LLMStatus.LOADING ? "opacity-50 pointer-events-none" : ""}`}>
      {llmStatus === LLMStatus.LOADING && (
        <div className="absolute inset-0 flex justify-center items-center">
          <span>Embedding Document...</span>
        </div>
      )}
      <MessagesDisplay messages={messages} />
      <div className="mt-auto relative">
        {llmStatus === LLMStatus.THINKING && (
          <div className="flex justify-center items-center absolute m-auto left-0 right-0 -top-6">
            <div className="animate-pulse text-sm">Thinking...</div>
          </div>
        )}
      </div>
      <div className="flex flex-row">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="p-2 w-full bg-gray-700 text-white rounded outline-none"
          placeholder="Type your message here..."
          ref={messageInputRef}
        />
        <button type="submit" className="bg-blue-600 text-white p-2 ml-4 h-full rounded" onClick={handleSubmit}>
          Send
        </button>
      </div>
      <div className="flex items-center w-full mt-4">
        <img className="h-5 w-10" src="/key.svg" style={{ filter: 'invert(90%)' }} alt="key"></img>
        <input
          type="password"
          className="p-2 w-full bg-gray-700 text-white rounded outline-none ml-2"
          placeholder="Enter OpenAI key..."
          onChange={(e) => setOpenAIKey(e.target.value)}
          value={openAIKey}
        />
      </div>
    </div>
  );
};

export default MessageForm;
