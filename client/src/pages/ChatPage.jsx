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
  const [deletingConv, setDeletingConv] = useState(false);

  // Edit message state
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
      if (selectedConvId && msg.conversation_id === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        chatApi.markAsRead(selectedConvId);
      }

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

    const handleMessageEdited = (editedMsg) => {
      if (selectedConvId && editedMsg.conversation_id === selectedConvId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === editedMsg.id ? { ...m, ...editedMsg } : m))
        );
      }
    };

    const handleMessageDeleted = ({ id, conversation_id }) => {
      if (selectedConvId && conversation_id === selectedConvId) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    };

    const handleConversationDeleted = ({ conversation_id }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversation_id));
      if (selectedConvId === conversation_id) {
        setSelectedConvId(null);
        setMessages([]);
        setMobileView('list');
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('conversation_deleted', handleConversationDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('conversation_deleted', handleConversationDeleted);
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

  // 5. Handle Editing Message
  const handleStartEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async (msgId) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await chatApi.editMessage(msgId, editContent.trim());
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ...updated } : m)));
      setEditingMsgId(null);
      toast.success('Message updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to edit message.');
    } finally {
      setSavingEdit(false);
    }
  };

  // 6. Handle Deleting Message
  const handleDeleteMessage = async (msgId) => {
    try {
      await chatApi.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success('Message deleted.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete message.');
    }
  };

  // 7. Handle Deleting Entire Conversation
  const handleDeleteConversation = async () => {
    if (!selectedConvId) return;
    if (!window.confirm('Are you sure you want to delete this chat conversation?')) return;

    setDeletingConv(true);
    try {
      await chatApi.deleteConversation(selectedConvId);
      setConversations((prev) => prev.filter((c) => c.id !== selectedConvId));
      setSelectedConvId(null);
      setMessages([]);
      setMobileView('list');
      toast.success('Chat deleted.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete chat.');
    } finally {
      setDeletingConv(false);
    }
  };

  // 8. Open New Chat Modal & Load Mutual Connections
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

  // 9. Select Mutual Connection from Modal
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

  // FEATURE 1: Exclude mutual connections who ALREADY have an active conversation from the New Chat modal list!
  const availableMutualConnections = mutualConnections.filter(
    (m) => !conversations.some((c) => c.other_user_id === m.id)
  );

  const filteredMutual = availableMutualConnections.filter((m) =>
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

                {/* Delete Conversation Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteConversation}
                  isLoading={deletingConv}
                  className="text-danger hover:bg-danger/10 text-xs font-semibold"
                  title="Delete Chat"
                >
                  🗑️ Delete Chat
                </Button>
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
                    const isEditing = editingMsgId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 group ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <Avatar
                            src={msg.sender_avatar_url || selectedConv.other_user_avatar_url}
                            name={msg.sender_name || selectedConv.other_user_name}
                            size="sm"
                          />
                        )}

                        <div className="flex items-center gap-1 max-w-[80%]">
                          {/* Message Edit & Delete Quick Actions for User's Own Messages */}
                          {isMe && !isEditing && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-1">
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="text-[11px] text-subtle hover:text-main p-1 rounded hover:bg-surface-subtle"
                                title="Edit Message"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-[11px] text-subtle hover:text-danger p-1 rounded hover:bg-surface-subtle"
                                title="Delete Message"
                              >
                                🗑️
                              </button>
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs shadow-sm space-y-1.5 w-full ${
                              isMe
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-surface text-main border border-main rounded-bl-none'
                            }`}
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-surface text-main border border-main rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingMsgId(null)}
                                    className="h-6 text-[10px] text-white/80"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSaveEdit(msg.id)}
                                    isLoading={savingEdit}
                                    className="h-6 text-[10px]"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                                <div
                                  className={`text-[9px] flex items-center justify-end gap-1.5 ${
                                    isMe ? 'text-white/75' : 'text-subtle'
                                  }`}
                                >
                                  {msg.is_edited && <span className="italic font-mono">(edited)</span>}
                                  <span>{format(new Date(msg.created_at), 'h:mm a')}</span>

                                  {/* Clear Read Status Checkmarks */}
                                  {isMe && (
                                    <span
                                      className={`font-bold text-[11px] ${
                                        msg.is_read ? 'text-cyan-300 font-extrabold' : 'text-white/50'
                                      }`}
                                      title={msg.is_read ? 'Seen / Read' : 'Delivered'}
                                    >
                                      {msg.is_read ? '✓✓' : '✓'}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
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

      {/* ── NEW CHAT MODAL: List Mutual Connections (Filter out existing chats) ──── */}
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
                <p className="text-xs text-muted">
                  {mutualConnections.length > 0
                    ? 'All your mutual connections already have active chats!'
                    : 'No mutual connections found.'}
                </p>
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
