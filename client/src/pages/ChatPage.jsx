import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../api/chatApi';
import { usersApi } from '../api/usersApi';
import { getSocket } from '../realtime/socket';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import Avatar from '../components/atoms/Avatar';
import Badge from '../components/atoms/Badge';
import Modal from '../components/molecules/Modal';
import Spinner from '../components/atoms/Spinner';
import SEO from '../components/atoms/SEO';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, "'Today at' h:mm a");
  }
  if (isYesterday(date)) {
    return format(date, "'Yesterday'");
  }
  return format(date, 'MMM d, yyyy');
}

export default function ChatPage() {
  const { user } = useAuth();

  // State
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Thread state
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  // New Chat Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mutualConnections, setMutualConnections] = useState([]);
  const [loadingMutual, setLoadingMutual] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [startingConvId, setStartingConvId] = useState(null);

  // Mobile active panel state ('list' | 'thread')
  const [mobileView, setMobileView] = useState('list');

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 1. Fetch Conversations List
  const loadConversations = useCallback(async () => {
    try {
      const res = await chatApi.getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load conversations.');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Fetch Messages for selected conversation
  const loadMessages = useCallback(async (convId) => {
    setLoadingMsgs(true);
    try {
      const res = await chatApi.getMessages(convId, { limit: 50 });
      // API returns newest first (created_at DESC). Reverse for display (oldest first).
      const list = res.data || res.messages || [];
      setMessages([...list].reverse());

      // Mark as read
      await chatApi.markAsRead(convId);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to load messages.');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    } else {
      setMessages([]);
    }
  }, [selectedConvId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 3. Socket.io Real-time Event Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // If message belongs to currently open conversation
      if (selectedConvId && msg.conversation_id === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        chatApi.markAsRead(selectedConvId);
      }

      // Update conversation preview & unread count in conversations list
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversation_id);
        if (index !== -1) {
          const target = prev[index];
          const updated = {
            ...target,
            last_message_content: msg.content,
            last_message_created_at: msg.created_at,
            last_message_at: msg.created_at,
            unread_count:
              msg.conversation_id === selectedConvId
                ? 0
                : (parseInt(target.unread_count || 0, 10) + 1),
          };
          const next = [...prev];
          next.splice(index, 1);
          return [updated, ...next];
        } else {
          // Re-fetch conversation list to pick up newly started conversation
          loadConversations();
          return prev;
        }
      });
    };

    const handleMessagesRead = ({ conversation_id }) => {
      if (selectedConvId && conversation_id === selectedConvId) {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [selectedConvId, loadConversations]);

  // 4. Handle Sending Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConvId || sending) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      const createdMsg = await chatApi.sendMessage(selectedConvId, content);
      setMessages((prev) => [...prev, createdMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? {
                ...c,
                last_message_content: createdMsg.content,
                last_message_created_at: createdMsg.created_at,
                last_message_at: createdMsg.created_at,
              }
            : c
        )
      );
    } catch (err) {
      toast.error(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // 5. Handle Opening New Chat Modal & Loading Mutual Connections
  const handleOpenNewChatModal = async () => {
    setIsModalOpen(true);
    setLoadingMutual(true);
    try {
      const res = await usersApi.listMutual(user.id);
      setMutualConnections(res.data || []);
    } catch (err) {
      toast.error('Failed to load mutual connections.');
    } finally {
      setLoadingMutual(false);
    }
  };

  // 6. Handle Creating or Opening Conversation from Modal
  const handleSelectMutualUser = async (targetUserId) => {
    setStartingConvId(targetUserId);
    try {
      const conv = await chatApi.getOrCreateConversation(targetUserId);
      setIsModalOpen(false);
      await loadConversations();
      setSelectedConvId(conv.id);
      setMobileView('thread');
    } catch (err) {
      toast.error(err.message || 'Could not start conversation.');
    } finally {
      setStartingConvId(null);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const filteredConversations = conversations.filter((c) =>
    (c.other_user_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMutual = mutualConnections.filter((m) =>
    (m.name || '').toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col space-y-4">
      <SEO title="Live Chat — Nest Feed" description="Chat in real-time with your mutual connections on CodeNest." />

      {/* Main Chat Layout Container */}
      <Card className="flex-1 flex overflow-hidden border-main p-0 shadow-lg">
        {/* ── LEFT PANEL: Conversations List ──────────────────────────── */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-main flex flex-col bg-surface shrink-0 ${
            mobileView === 'thread' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Top Search Bar */}
          <div className="p-4 border-b border-main space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-main font-mono">Messages</h2>
              <Badge variant="primary" size="sm">Real-time</Badge>
            </div>
            <input
              type="search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-subtle border border-main rounded-xl px-3.5 py-2 text-xs text-main placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-main">
            {loadingConvs ? (
              <div className="p-8 text-center"><Spinner size="md" /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-3xl">💬</p>
                <p className="text-xs text-muted">
                  {searchQuery ? 'No matching conversations.' : 'Start a conversation with one of your mutual connections'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const unread = parseInt(conv.unread_count || 0, 10);
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileView('thread');
                    }}
                    className={`w-full p-4 flex items-start gap-3 text-left transition-all hover:bg-surface-subtle ${
                      isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                    }`}
                  >
                    <Avatar src={conv.other_user_avatar_url} name={conv.other_user_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-main truncate">{conv.other_user_name}</h4>
                        <span className="text-[10px] text-subtle shrink-0">
                          {formatMessageTime(conv.last_message_at || conv.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate pt-1">
                        {conv.last_message_content
                          ? (conv.last_message_content.length > 50
                              ? `${conv.last_message_content.slice(0, 50)}...`
                              : conv.last_message_content)
                          : 'No messages yet'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Action: New Chat Button */}
          <div className="p-3 border-t border-main bg-surface-subtle">
            <Button
              variant="primary"
              size="sm"
              className="w-full font-bold"
              onClick={handleOpenNewChatModal}
            >
              + New Chat
            </Button>
          </div>
        </div>

        {/* ── RIGHT PANEL: Message Thread ────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col bg-surface-subtle ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 bg-surface border-b border-main flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden text-muted hover:text-main text-xs font-bold mr-1"
                  >
                    ← Back
                  </button>
                  <Avatar src={selectedConv.other_user_avatar_url} name={selectedConv.other_user_name} size="sm" />
                  <div>
                    <h3 className="text-sm font-bold text-main">{selectedConv.other_user_name}</h3>
                    <span className="text-[10px] text-success font-semibold">● Mutual Connection</span>
                  </div>
                </div>
              </div>

              {/* Message History Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMsgs ? (
                  <div className="flex min-h-[40vh] items-center justify-center"><Spinner size="md" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex min-h-[40vh] flex-col items-center justify-center text-center space-y-2 text-muted">
                    <span className="text-4xl">👋</span>
                    <p className="text-sm font-medium">Say hello to {selectedConv.other_user_name}!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <Avatar
                            src={msg.sender_avatar_url || selectedConv.other_user_avatar_url}
                            name={msg.sender_name || selectedConv.other_user_name}
                            size="sm"
                          />
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm space-y-1 ${
                            isMe
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-surface text-main border border-main rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                          <div
                            className={`text-[9px] flex items-center justify-end gap-1 ${
                              isMe ? 'text-white/70' : 'text-subtle'
                            }`}
                          >
                            <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                            {isMe && <span>{msg.is_read ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-main flex items-center gap-2">
                <input
                  type="text"
                  placeholder="type a message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  maxLength={2000}
                  className="flex-1 bg-surface-subtle border border-main rounded-xl px-4 py-2.5 text-xs text-main placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button type="submit" variant="primary" size="sm" isLoading={sending} disabled={!messageInput.trim()}>
                  Send
                </Button>
              </form>
            </>
          ) : (
            /* Empty state when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                💬
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-main">Your Messages</h3>
                <p className="text-xs text-muted">
                  start a conversation with one of your mutual connections
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleOpenNewChatModal}>
                Start New Chat
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ── NEW CHAT MODAL: List Mutual Connections ───────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Start New Chat"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search mutual connections..."
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
          />

          <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-main">
            {loadingMutual ? (
              <div className="p-6 text-center"><Spinner size="md" /></div>
            ) : filteredMutual.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-muted">No mutual connections found.</p>
                <p className="text-[11px] text-subtle">
                  Connect with other developers who follow you back to chat!
                </p>
              </div>
            ) : (
              filteredMutual.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-2.5 hover:bg-surface-subtle rounded-lg transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={conn.avatar_url} name={conn.name} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-main">{conn.name}</h4>
                      {conn.bio && <p className="text-[10px] text-muted line-clamp-1">{conn.bio}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={startingConvId === conn.id}
                    onClick={() => handleSelectMutualUser(conn.id)}
                  >
                    Chat
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
