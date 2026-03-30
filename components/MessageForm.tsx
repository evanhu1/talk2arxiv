"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessagesDisplay from './MessageList';
import { Message, LLMStatus } from "../utils/types";
import { insertPDF, getBotReply } from "../utils/llmtools";
import { Send, KeyRound, Trash2, Loader2 } from 'lucide-react';
import { siGithub } from 'simple-icons';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" fill="currentColor" dangerouslySetInnerHTML={{ __html: siGithub.svg.replace(/<svg[^>]*>/, '').replace('</svg>', '') }} />
);


const DEFAULT_TEXT = "Hello! Ask me any question about this paper. To refer to a specific section, say \u2018Section ___\u2019 using the section name (not number). OpenAI key is optional for now.\n\nTry: \u201CSummarize the Introduction in simple terms\u201D"

const MessageForm = ({ paper_id }: { paper_id: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [llmStatus, setLlmStatus] = useState(LLMStatus.IDLE);
  const [openAIKey, setOpenAIKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // SSR-safe localStorage hydration
  useEffect(() => {
    const stored = localStorage.getItem(paper_id);
    if (stored) {
      try { setMessages(JSON.parse(stored)); } catch { /* ignore corrupt data */ }
    } else {
      setMessages([{ sender: "bot", text: DEFAULT_TEXT }]);
    }
    setOpenAIKey(localStorage.getItem("OPENAI_API_KEY") ?? "");
  }, [paper_id]);

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(paper_id, JSON.stringify(messages));
  }, [messages, paper_id]);

  useEffect(() => {
    localStorage.setItem("OPENAI_API_KEY", openAIKey);
  }, [openAIKey]);

  useEffect(() => {
    const embed = async () => {
      setLlmStatus(LLMStatus.LOADING);
      await insertPDF(paper_id);
      setLlmStatus(LLMStatus.IDLE);
    };
    embed();
  }, [paper_id]);

  const canSend = llmStatus === LLMStatus.IDLE || llmStatus === LLMStatus.SUCCESS || llmStatus === LLMStatus.ERROR;

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || !canSend) return;
    const userMessage = message.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: "user" }]);
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const reply = await getBotReply(userMessage, messages, paper_id, setLlmStatus, openAIKey);
    setMessages(prev => [...prev, { text: reply, sender: "bot" }]);
  }, [message, messages, paper_id, openAIKey, canSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="shrink-0 px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-serif text-[1.4rem] text-text-primary tracking-tight leading-none">
              Talk2Arxiv
            </h1>
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-accent/60">
              beta
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowKeyInput(v => !v)}
              className={`p-2 rounded-lg transition-colors ${
                showKeyInput
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-3'
              }`}
              title="API Key"
            >
              <KeyRound className="w-[15px] h-[15px]" />
            </button>
            <button
              onClick={() => setMessages([{ sender: "bot", text: DEFAULT_TEXT }])}
              className="p-2 rounded-lg text-text-tertiary hover:text-red-400/80 hover:bg-red-400/5 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-[15px] h-[15px]" />
            </button>
            <a
              href="https://github.com/evanhu1/talk2arxiv"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-3 transition-colors"
              title="View on GitHub"
            >
              <GithubIcon className="w-[15px] h-[15px]" />
            </a>
          </div>
        </div>

        {showKeyInput && (
          <div className="mt-3 animate-slide-up">
            <input
              type="password"
              className="w-full px-3 py-2 bg-surface-2 text-text-primary text-[13px] rounded-lg border border-border hover:border-border-hover focus:border-accent/40 placeholder:text-text-tertiary outline-none"
              placeholder="sk-... (OpenAI key, optional)"
              onChange={(e) => setOpenAIKey(e.target.value)}
              value={openAIKey}
            />
          </div>
        )}
      </header>

      {/* Loading state */}
      {llmStatus === LLMStatus.LOADING && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border border-accent/20" />
            <Loader2 className="w-10 h-10 text-accent absolute inset-0 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm text-text-secondary">Embedding document</p>
            <p className="text-xs text-text-tertiary mt-1">Preparing paper for conversation...</p>
          </div>
        </div>
      )}

      {/* Chat messages */}
      {llmStatus !== LLMStatus.LOADING && (
        <div className="flex-1 min-h-0">
          <MessagesDisplay messages={messages} />
        </div>
      )}

      {/* Input area */}
      {llmStatus !== LLMStatus.LOADING && (
        <div className="shrink-0 p-4 border-t border-border">
          {llmStatus === LLMStatus.THINKING && (
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="flex gap-[3px]">
                <span className="w-[5px] h-[5px] bg-accent/70 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-[5px] h-[5px] bg-accent/70 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-[5px] h-[5px] bg-accent/70 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[11px] text-text-tertiary font-medium">Thinking...</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleInput(); }}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-2.5 bg-surface-2 text-text-primary text-[13px] leading-relaxed rounded-xl border border-border hover:border-border-hover focus:border-accent/40 placeholder:text-text-tertiary outline-none resize-none"
              placeholder="Ask about this paper..."
              rows={1}
              disabled={llmStatus === LLMStatus.THINKING}
              style={{ minHeight: 42 }}
            />
            <button
              onClick={handleSubmit}
              disabled={!canSend || !message.trim()}
              className="p-2.5 rounded-xl bg-accent/90 text-surface-0 hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
            >
              <Send className="w-[15px] h-[15px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageForm;
