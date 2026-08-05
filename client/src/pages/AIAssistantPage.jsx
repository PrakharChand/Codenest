import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { aiAssistantApi } from '../api/aiAssistantApi';
import ChatHistorySidebar from '../components/organisms/ChatHistorySidebar';
import ChatWindow from '../components/organisms/ChatWindow';
import ChatLimitModal from '../components/molecules/ChatLimitModal';
import Button from '../components/atoms/Button';

export default function AIAssistantPage() {
  const location = useLocation();
  const isShadowMode = location.pathname.includes('/shadow/');
  const mode = isShadowMode ? 'shadow' : 'feed';

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  // 5-Chat Limit Modal state
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitConversations, setLimitConversations] = useState([]);

  // Load conversations list
  const loadConversations = async (autoSelect = true) => {
    setLoadingConvs(true);
    try {
      const data = await aiAssistantApi.getConversations(mode);
      const convList = data.conversations || [];
      setConversations(convList);

      if (autoSelect && convList.length > 0 && !activeConvId) {
        setActiveConvId(convList[0].id);
      }
    } catch (err) {
      toast.error('Failed to load conversations history.');
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    setActiveConvId(null);
    setMessages([]);
    loadConversations(true);
  }, [mode]);

  // Load messages when activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMsgs(true);
      try {
        const data = await aiAssistantApi.getMessages(activeConvId);
        setMessages(data.messages || []);
      } catch (err) {
        toast.error('Failed to load conversation messages.');
      } finally {
        setLoadingMsgs(false);
      }
    };

    loadMessages();
  }, [activeConvId]);

  // Handle New Chat creation
  const handleNewChat = async () => {
    try {
      const data = await aiAssistantApi.createConversation(mode, 'New Conversation');
      const newConv = data.conversation;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
      toast.success('Started a new conversation!');
    } catch (err) {
      if (err.status === 409 || err.code === 'CONVERSATION_LIMIT_REACHED') {
        const payload = err.data || err.response?.data || {};
        setLimitConversations(payload.conversations || conversations);
        setLimitModalOpen(true);
      } else {
        toast.error(err.message || 'Could not start new chat.');
      }
    }
  };

  // Handle sending a prompt
  const handleSendMessage = async (promptText) => {
    let currentId = activeConvId;

    // If no active conversation exists, create one first
    if (!currentId) {
      try {
        const data = await aiAssistantApi.createConversation(mode, promptText.slice(0, 30));
        const newConv = data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        currentId = newConv.id;
      } catch (err) {
        if (err.status === 409 || err.code === 'CONVERSATION_LIMIT_REACHED') {
          const payload = err.data || err.response?.data || {};
          setLimitConversations(payload.conversations || conversations);
          setLimitModalOpen(true);
          return;
        }
        toast.error('Could not create conversation.');
        return;
      }
    }

    // Optimistically push user message
    const tempUserMsg = { id: 'temp-user', sender: 'user', content: promptText };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSendingMsg(true);

    try {
      const data = await aiAssistantApi.sendMessage(currentId, promptText);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'temp-user'),
        data.userMessage,
        data.assistantMessage,
      ]);
      loadConversations(false);
    } catch (err) {
      toast.error('Failed to generate response.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    try {
      await aiAssistantApi.renameConversation(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
      toast.success('Conversation renamed!');
    } catch (err) {
      toast.error('Could not rename conversation.');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await aiAssistantApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Conversation deleted.');
      if (limitModalOpen) setLimitModalOpen(false);
    } catch (err) {
      toast.error('Could not delete conversation.');
    }
  };

  const handleDeleteOldest = async () => {
    try {
      const data = await aiAssistantApi.deleteOldestConversation(mode);
      if (data.deleted) {
        toast.success(`Deleted oldest chat: "${data.deleted.title}"`);
        await loadConversations(false);
        handleNewChat();
      }
    } catch (err) {
      toast.error('Could not delete oldest conversation.');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <span>{isShadowMode ? '🥷 Shadow Mentor' : '🤖 CodeNest Guide'}</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {isShadowMode
              ? 'Anonymous peer code review standards, DSA, System Design, and code refactoring.'
              : 'Interactive developer guide for CodeNest features, creator info, and programming.'}
          </p>
        </div>

        <Link to="/settings/ai">
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
            <span>⚙️</span>
            <span>AI Settings</span>
          </Button>
        </Link>
      </div>

      {/* Main Dual Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        <ChatHistorySidebar
          mode={mode}
          conversations={conversations}
          activeId={activeConvId}
          onSelectConversation={(id) => setActiveConvId(id)}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        <ChatWindow
          mode={mode}
          conversation={activeConv}
          messages={messages}
          loading={loadingMsgs}
          sending={sendingMsg}
          onSendMessage={handleSendMessage}
          onRegenerate={() => {
            const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
            if (lastUserMsg) handleSendMessage(lastUserMsg.content);
          }}
        />
      </div>

      {/* 5-Chat Limit Prompt Modal */}
      <ChatLimitModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        conversations={limitConversations}
        onDeleteConversation={handleDeleteConversation}
        onDeleteOldest={handleDeleteOldest}
      />
    </div>
  );
}
