/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useMemo } from "react";
import MessagesDisplay from "./MessageList";
import { Message, LLMStatus } from "../utils/types";
import { insertPDF, getBotReply } from "../utils/llmtools";

const DEFAULT_TEXT = "Hello! Ask me any question about this paper! To refer to a specific section of the paper, make sure to say 'Section ___' where ___ is the name of the section, not the number. OpenAI key is also optional for now."

const MessageForm = ({ paper_id }: { paper_id: string }) => {
  const [messages, setMessages] = useState<Message[]>(
    localStorage.getItem(paper_id)
      ? JSON.parse(localStorage.getItem(paper_id) ?? "{}")
      : [
          {
            sender: "bot",
            text: DEFAULT_TEXT,
          },
        ]
  );
  const [message, setMessage] = useState("");
  const [llmStatus, setLlmStatus] = useState(LLMStatus.IDLE);
  const [openAIKey, setOpenAIKey] = useState(
    localStorage.getItem("OPENAI_API_KEY") ?? ""
  );

  const handleSubmit = async () => {
    if (
      message.trim() &&
      (llmStatus === LLMStatus.IDLE ||
        llmStatus === LLMStatus.SUCCESS ||
        llmStatus === LLMStatus.ERROR)
    ) {
      setMessages((messages) => [
        ...messages,
        { text: message, sender: "user" },
      ]);
      setMessage("");

      const reply = await getBotReply(
        message,
        messages,
        paper_id,
        setLlmStatus,
        openAIKey
      );
      if (
        llmStatus === LLMStatus.IDLE ||
        llmStatus === LLMStatus.SUCCESS ||
        llmStatus === LLMStatus.ERROR
      ) {
        setMessages((messages) => [
          ...messages,
          { text: reply, sender: "bot" },
        ]);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem("OPENAI_API_KEY", openAIKey);
  }, [openAIKey]);

  useEffect(() => {
    localStorage.setItem(paper_id, JSON.stringify(messages));
  }, [messages, paper_id]);

  useEffect(() => {
    const loadMessagesAndEmbedPDF = async () => {
      setLlmStatus(LLMStatus.LOADING);
      await insertPDF(paper_id);
      setLlmStatus(LLMStatus.IDLE);
    };

    loadMessagesAndEmbedPDF();
  }, [paper_id]);

  const messageInputRef = useRef<HTMLInputElement>(null);
  document.onkeydown = (e: KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      messageInputRef.current === document.activeElement
    ) {
      const selection = window.getSelection();
      console.log(selection?.toString());
      handleSubmit();
    }
  };

  return (
    <div
      className={`absolute md:relative rounded shadow-lg p-4 bg-gray-800 mb-4 w-full min-h-0 flex-auto flex flex-col ${
        llmStatus === LLMStatus.LOADING ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <button
        className="absolute -top-[68px] right-0 m-4 bg-red-500 text-white p-2 rounded text-sm hover:bg-red-700"
        onClick={() => setMessages([{
          sender: "bot",
          text: DEFAULT_TEXT,
        },])}
      >
        Clear History
      </button>
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
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-800 text-white p-2 ml-4 h-full rounded"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
      <div className="flex items-center w-full mt-4">
        <img
          className="h-5 w-10"
          src="/key.svg"
          style={{ filter: "invert(90%)" }}
          alt="key"
        ></img>
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
