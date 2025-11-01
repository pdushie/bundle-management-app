"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, Search, Loader2, MessageSquare, ChevronLeft, Bell, CheckCircle } from "lucide-react";
import { ChatMessage, ChatThread, ChatPagination } from "@/types/chat";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

export default function AdminChatPanel() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use real-time updates for chat
  const isAdminUser = session?.user && ['admin', 'standard_admin', 'super_admin'].includes(session.user.role || '');
  
  useRealtimeUpdates({
    enabled: !!isAdminUser,
    onChatMessage: (data) => {
      if (data.type === 'new_message') {
        // Only refresh threads if we're not already loading and it's a different user
        if (!threadsLoading && (!selectedUserId || data.userId !== selectedUserId)) {
          fetchThreads();
        }
        
        // If viewing this user's messages, add the new message directly
        // Check if this message should be displayed:
        // 1. Admin→User: data.recipientId === selectedUserId
        // 2. User→Admin: data.recipientType === 'admin' AND data.userId === selectedUserId
        const shouldDisplayMessage = selectedUserId && data.message && (
          (data.recipientId === selectedUserId) || // Admin→User
          (data.recipientType === 'admin' && data.userId === selectedUserId) // User→Admin
        );
        

        
        if (shouldDisplayMessage) {
          setMessages(prev => [...prev, data.message]);
          // Auto-scroll to show new message
          setTimeout(() => scrollToBottom(), 100);
        }
      } else if (data.type === 'message_read') {
        // Messages were marked as read, refresh threads only if not loading
        if (!threadsLoading) {
          fetchThreads();
        }
      }
    }
  });

  const fetchThreads = useCallback(async () => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin")) return;
    
    try {
      setThreadsLoading(true);
      const response = await fetch("/api/chat/threads");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch threads: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.threads) {
        setThreads(data.threads);
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setThreadsLoading(false);
    }
  }, [session]);

  const fetchMessages = async (userId: number, page: number = 1, append: boolean = false) => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin")) {
      return;
    }
    
    setMessagesLoading(true);
    
    try {
      const url = `/api/chat?userId=${userId}&page=${page}&limit=50`;
      const response = await fetch(url);
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('fetchMessages: Invalid content type:', contentType);
        throw new Error('Invalid response format from server');
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        if (append) {
          // Append older messages to the beginning
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          // Replace messages (initial load)
          setMessages(data.messages);
        }
        
        // Update pagination state
        if (data.pagination) {
          setCurrentPage(data.pagination.page);
          setHasMoreMessages(data.pagination.hasMore);
          setTotalMessages(data.pagination.total);
        }
        
        // Update the thread's unread count to 0 since we've read the messages
        setThreads(threads.map(thread => 
          thread.userId === userId ? { ...thread, unreadCount: 0 } : thread
        ));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Fetch threads on component mount only - real-time updates will handle refreshes
  useEffect(() => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin")) return;
    
    fetchThreads();
  }, [session, fetchThreads]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling fallback for production (especially Vercel where SSE may not work)
  useEffect(() => {
    if (!session?.user || !selectedUserId) return;
    
    const isProduction = process.env.NODE_ENV === 'production' || (typeof window !== 'undefined' && window.location.hostname.includes('vercel'));
    if (!isProduction) return; // Only poll in production
    
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && selectedUserId) {
        // Refresh current conversation and threads
        fetchMessages(selectedUserId, 1, false);
        fetchThreads();
      }
    }, 2000); // Poll every 2 seconds in production
    
    return () => clearInterval(interval);
  }, [session, selectedUserId, fetchMessages, fetchThreads]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !session?.user || !selectedUserId) return;
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: newMessage,
          recipientId: selectedUserId
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }
      
      const data = await response.json();
      
      if (data.success && data.message) {
        setMessages([...messages, data.message]);
        setNewMessage("");
        
        // Update the thread with the new message
        setThreads(threads.map(thread => {
          if (thread.userId === selectedUserId) {
            return {
              ...thread,
              lastMessage: data.message
            };
          }
          return thread;
        }));
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // First, check if the timestamp is valid
      if (!timestamp) return '';
      
      // Try to parse the timestamp
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Console statement removed for security
        return '';
      }
      
      // Format the time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      // Console statement removed for security
      return '';
    }
  };

  const selectUser = (userId: number) => {
    setSelectedUserId(userId);
    setCurrentPage(1);
    setMessages([]);
    setHasMoreMessages(false);
    setTotalMessages(0);
    fetchMessages(userId, 1, false);
  };

  const loadMoreMessages = () => {
    if (selectedUserId && hasMoreMessages && !messagesLoading) {
      fetchMessages(selectedUserId, currentPage + 1, true);
    }
  };

  const backToThreads = () => {
    setSelectedUserId(null);
    setMessages([]);
    fetchThreads(); // Refresh threads when going back
  };

  // Filter threads by search term
  const filteredThreads = searchTerm
    ? threads.filter(thread => 
        thread.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : threads;

  // Calculate total unread messages
  const totalUnread = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  // Don't show if not admin, super_admin, or standard_admin (all should have chat access via RBAC)
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin")) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedUserId ? (
            <button onClick={backToThreads} className="p-1 hover:bg-blue-700 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h2 className="text-lg font-medium">
            {selectedUserId 
              ? threads.find(t => t.userId === selectedUserId)?.userName || "Chat" 
              : "Customer Support Chat"}
          </h2>
        </div>
        {!selectedUserId && totalUnread > 0 && (
          <div className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 flex items-center">
            <Bell className="h-3 w-3 mr-1" />
            {totalUnread}
          </div>
        )}
      </div>
      
      {/* Chat Interface */}
      <div className="flex h-[calc(100%-60px)]">
        {/* Thread List */}
        {!selectedUserId && (
          <div className="w-full border-r border-gray-200">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
                />
              </div>
            </div>
            
            {/* Thread List */}
            <div className="overflow-y-auto h-[calc(100%-73px)]">
              {filteredThreads.length === 0 ? (
                <div className="text-center text-gray-700 py-8">
                  {searchTerm ? "No matching users found" : "No chat threads yet"}
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <div
                    key={thread.userId}
                    onClick={() => selectUser(thread.userId)}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
                      thread.unreadCount > 0 ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium text-gray-900">{thread.userName}</h3>
                      {thread.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 truncate">{thread.userEmail}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-gray-700 truncate max-w-[70%]">
                        {thread.lastMessage.message}
                      </p>
                      <span className="text-xs text-gray-700">
                        {formatTimestamp(thread.lastMessage.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {selectedUserId && (
          <div className="w-full flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Load More Button */}
              {hasMoreMessages && messages.length > 0 && (
                <div className="flex justify-center pb-4">
                  <button
                    onClick={loadMoreMessages}
                    disabled={messagesLoading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {messagesLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      `Load ${Math.min(50, totalMessages - messages.length)} more messages`
                    )}
                  </button>
                </div>
              )}

              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-700 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderType === "admin" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.senderType === "admin"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      <div className="text-sm">{msg.message}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`text-xs ${
                            msg.senderType === "admin" ? "text-blue-200" : "text-gray-700"
                          }`}
                        >
                          {formatTimestamp(msg.createdAt)}
                        </span>
                        {msg.senderType === "admin" && msg.read && (
                          <CheckCircle className="h-3 w-3 text-blue-200" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <form onSubmit={sendMessage} className="border-t border-gray-200 p-3">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base text-gray-900 bg-white placeholder:text-gray-700"
                />
                <button
                  type="submit"
                  disabled={loading || !newMessage.trim()}
                  className={`bg-blue-600 text-white p-2 rounded-r-lg ${
                    loading || !newMessage.trim()
                      ? "opacity-50"
                      : "hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

