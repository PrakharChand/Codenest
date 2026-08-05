import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import MarkdownView from '../organisms/MarkdownView';
import CodeBlock from '../atoms/CodeBlock';
import Button from '../atoms/Button';
import Spinner from '../atoms/Spinner';

const SUGGESTED_QUESTIONS = {
  feed: [
    'Who built CodeNest and what is the creator\'s background?',
    'How does Nest Shadow work on CodeNest?',
    'What technologies are used to build CodeNest?',
    'Explain React Hooks with an example',
    'What is the difference between REST and GraphQL?',
  ],
  shadow: [
    'How do I write a constructive, bias-free code review?',
    'Explain Binary Search and its time complexity',
    'What are the best practices for clean C++ / Python code?',
    'Explain System Design principles for web scaling',
    'How do I optimize database queries in Node.js?',
  ],
};

/**
 * ChatWindow — Main conversational window with Markdown rendering, CodeBlock support,
 * suggested questions, typing indicator, and copy actions.
 */
export default function ChatWindow({
  mode = 'feed',
  conversation,
  messages = [],
  loading = false,
  sending = false,
  onSendMessage,
  onRegenerate,
}) {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef(null);

  const suggestions = SUGGESTED_QUESTIONS[mode] || SUGGESTED_QUESTIONS.feed;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!prompt.trim() || sending) return;
    const text = prompt.trim();
    setPrompt('');
    onSendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopyText = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Message content copied!');
  };

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
      {/* Top Bar Header */}
      <div className="p-4 border-b border-[var(--border-main)] bg-[var(--bg-surface-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center text-xl select-none shadow-sm">
            {mode === 'shadow' ? '🥷' : '🤖'}
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <span>{mode === 'shadow' ? 'Shadow Mentor' : 'CodeNest Guide'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20 uppercase tracking-wider">
                Online
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] truncate max-w-md">
              {conversation ? conversation.title : (mode === 'shadow' ? 'Anonymous Peer Review & Technical Mentor' : 'CodeNest Platform & Software Engineering Guide')}
            </p>
          </div>
        </div>
      </div>

      {/* Message Body List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] space-y-6 text-center max-w-xl mx-auto py-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-dim)] flex items-center justify-center text-3xl shadow-md animate-bounce">
              {mode === 'shadow' ? '🥷' : '🤖'}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text-main)]">
                {mode === 'shadow' ? 'Welcome to Shadow Mentor 🥷' : 'Welcome to CodeNest Guide 🤖'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {mode === 'shadow'
                  ? 'Ask me about code review standards, DSA complexity, system design, or code refactoring!'
                  : 'Ask me anything about CodeNest features, creator Prakhar, or software development concepts!'}
              </p>
            </div>

            {/* Suggested Starter Questions */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[11px] font-bold text-[var(--text-subtle)] uppercase tracking-wider block text-left">
                Suggested Starter Questions:
              </span>
              <div className="flex flex-col gap-2">
                {suggestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendMessage(q)}
                    className="text-left px-3.5 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--color-primary)] text-xs text-[var(--text-main)] transition-all font-medium flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-[var(--color-primary)] transition-opacity">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id || Math.random()}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 select-none shadow-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-main)]">
                  {isUser ? '👤' : (mode === 'shadow' ? '🥷' : '🤖')}
                </div>

                {/* Message Bubble Container */}
                <div className={`group relative rounded-2xl p-4 text-xs space-y-2 border ${
                  isUser
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] rounded-tr-none'
                    : 'bg-[var(--bg-surface-subtle)] text-[var(--text-main)] border-[var(--border-main)] rounded-tl-none shadow-sm'
                }`}>
                  <div className="leading-relaxed">
                    {isUser ? (
                      <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    ) : (
                      <MarkdownView source={msg.content} />
                    )}
                  </div>

                  {/* Copy Action Button */}
                  {!isUser && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-main)]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.content)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface-hover)] transition-colors"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>

                      {onRegenerate && (
                        <button
                          type="button"
                          onClick={onRegenerate}
                          className="text-[10px] text-[var(--color-primary)] hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface-hover)] transition-colors"
                        >
                          <span>🔄</span>
                          <span>Regenerate</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {sending && (
          <div className="flex gap-3 mr-auto max-w-3xl">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 select-none bg-[var(--bg-surface-subtle)] border border-[var(--border-main)]">
              {mode === 'shadow' ? '🥷' : '🤖'}
            </div>
            <div className="rounded-2xl rounded-tl-none p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-main)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping inline-block"></span>
              <span>Generating intelligent response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Prompt Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-[var(--border-main)] bg-[var(--bg-surface-subtle)]">
        <div className="relative flex items-center">
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'shadow' ? 'Ask Shadow Mentor about code, DSA, or reviews...' : 'Ask CodeNest Guide anything about CodeNest or programming...'}
            className="w-full pl-4 pr-24 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] placeholder-[var(--text-subtle)] resize-none focus:outline-none focus:border-[var(--color-primary)] leading-relaxed"
          />

          <div className="absolute right-3 flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={sending}
              disabled={!prompt.trim()}
            >
              Send 🚀
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
