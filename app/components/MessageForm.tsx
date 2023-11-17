/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import MessagesDisplay from './MessageList';
import OpenAI from "openai";
import { Message, LLMStatus } from "../../utils/types";

const MessageForm = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [llmStatus, setLlmStatus] = useState(LLMStatus.IDLE);
  const [openAIKey, setOpenAIKey] = useState('');

  const memoizedOpenAI = useMemo(() => {
    return new OpenAI({apiKey: openAIKey, dangerouslyAllowBrowser: true });
  }, [openAIKey]);
  
  useEffect(() => {
    const cachedApiKey = localStorage.getItem('OPENAI_API_KEY');
    if (cachedApiKey) {
      setOpenAIKey(cachedApiKey);
    }
  }, [memoizedOpenAI]);

  useEffect(() => {
    const id = window.location.pathname.substring(1);
    localStorage.setItem(id, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const embedPDF = async () => {
      setLlmStatus(LLMStatus.LOADING);

    const id = window.location.pathname.substring(1);
    const savedMessages = localStorage.getItem(id);

      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }

      await fetch('http://localhost:3000/api/embeddings/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "id": window.location.pathname.substring(1) }),
      }).then((res) => res.json()).catch((err) => console.log(err));

      setLlmStatus(LLMStatus.IDLE);
    }

    embedPDF();
  }, []);

  const PROMPT_TEMPLATE = (history: string, context: string[], question: string) => `
    Context information and chat history is provided below. Given the context information and not prior knowledge, provide detailed answer to the question.

    ### Context:
    ---------------------
    ${context}
    ---------------------

    ### Chat History:
    ---------------------
    ${history}
    ---------------------

    ### Question: ${question}
  `

  const constructPrompt = async (message: string) => {
    const userInput = message;

    const lastFiveMessages = messages.slice(Math.max(messages.length - 5, 0)).reduce((acc, msg) => {
      if (msg.sender === 'user') {
        return acc + `User: ${msg.text}\nAI: `;
      } else {
        return acc + `User: \nAI: ${msg.text}\n`;
      }
    }, '');

    const context = await fetch('http://localhost:3000/api/embeddings/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "query": userInput }),
    }).then((res) => res.json()).catch((err) => {console.log(err); return { status: 'error', data: [] }});

    if (context.status === 'success') {
      return PROMPT_TEMPLATE(lastFiveMessages, context.data, userInput);
    }

    setLlmStatus(LLMStatus.ERROR);
  }

  const getBotReply = async (message: string) => {
    setLlmStatus(LLMStatus.THINKING);
    const prompt = await constructPrompt(message) ?? "";

    if (prompt === "") {
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
    if (message.trim() && (llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS)) {
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
      handleSubmit(e as unknown as React.MouseEvent<HTMLButtonElement, MouseEvent>);
    }
  };

  const messageInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <>
      <div className={`rounded shadow-lg p-4 bg-gray-800 relative w-full h-full flex flex-col mb-4 ${llmStatus === LLMStatus.LOADING ? "opacity-50 pointer-events-none" : ""}`}>
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
      <div className="flex items-center w-full">
        <img className="h-5 w-10" src="/key.svg" style={{ filter: 'invert(90%)' }} alt="key"></img>
        <input
          type="password"
          className="p-2 w-full bg-gray-700 text-white rounded outline-none ml-2"
          placeholder="Enter OpenAI key..."
          onChange={(e) => setOpenAIKey(e.target.value)}
          value={openAIKey}
        />
      </div>
    </>
  );
};

export default MessageForm;
