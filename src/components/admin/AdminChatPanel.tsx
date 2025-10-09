"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Send, Search, Loader2, MessageSquare, ChevronLeft, Bell, CheckCircle } from "lucide-react";
import { ChatMessage, ChatThread } from "@/types/chat";

export default function AdminChatPanel() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads on component mount and periodically
  useEffect(() => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
    
    fetchThreads();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchThreads();
        if (selectedUserId) {
          fetchMessages(selectedUserId);
        }
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [session, selectedUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for visibility changes to refresh messages when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session?.user) {
        fetchThreads();
        if (selectedUserId) {
          fetchMessages(selectedUserId);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, selectedUserId]);

  const fetchThreads = async () => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
    
    try {
      console.log("Fetching chat threads for admin...");
      const response = await fetch("/api/chat/threads");
      
      console.log("Threads response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch threads: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log("Threads response text:", responseText);
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse threads response as JSON:", parseError);
        throw new Error("Invalid response format");
      }
      
      if (data.success && data.threads) {
        console.log(`Fetched ${data.threads.length} threads successfully:`, data.threads);
        setThreads(data.threads);
      } else {
        console.error("No threads data returned:", data);
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    }
  };

  const fetchMessages = async (userId: number) => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/chat?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        setMessages(data.messages);
        
        // Update the thread's unread count to 0 since we've read the messages
        setThreads(threads.map(thread => 
          thread.userId === userId ? { ...thread, unreadCount: 0 } : thread
        ));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error("Error sending message:", error);
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
        console.error('Invalid date:', timestamp);
        return '';
      }
      
      // Format the time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  const selectUser = (userId: number) => {
    setSelectedUserId(userId);
    fetchMessages(userId);
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

  // Don't show if not admin or superadmin
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {loading && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-700 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-600" />
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
