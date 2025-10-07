"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Send, X, MessageSquare, Loader2, ChevronDown } from "lucide-react";
import { ChatMessage } from "@/types/chat";

export default function UserChat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch messages on component mount and periodically
  useEffect(() => {
    if (!session?.user) return;
    
    fetchMessages();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [session]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for visibility changes to refresh messages when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session?.user) {
        fetchMessages();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  const fetchMessages = async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch("/api/chat");
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        setMessages(data.messages);
        
        // Count unread messages from admin
        const unread = data.messages.filter(
          (msg: ChatMessage) => msg.senderType === "admin" && !msg.read
        ).length;
        
        setUnreadCount(unread);
        
        // If this is the first load and we have messages, open the chat
        if (initialLoad && data.messages.length > 0) {
          setInitialLoad(false);
          // Only open automatically if there are unread messages
          if (unread > 0) {
            setIsChatOpen(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !session?.user) return;
    
    setLoading(true);
    console.log("Sending message:", newMessage);
    console.log("Session user:", session.user);
    
    try {
      const messagePayload = { message: newMessage };
      console.log("Sending payload:", messagePayload);
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      });
      
      console.log("Response status:", response.status);
      const responseText = await response.text();
      console.log("Response text:", responseText);
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error("Invalid response format");
      }
      
      if (data.success && data.message) {
        console.log("Message sent successfully:", data.message);
        setMessages([...messages, data.message]);
        setNewMessage("");
        
        // Immediately fetch messages to ensure everything is in sync
        setTimeout(() => fetchMessages(), 300);
      } else {
        console.error("Message not successful:", data);
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
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

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      // When opening chat, mark messages as read
      fetchMessages();
    }
  };

  // Don't show if not logged in
  if (!session?.user) return null;

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-50 bg-blue-600 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center"
      >
        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-16 sm:bottom-20 left-2 sm:left-4 lg:left-6 right-2 sm:right-auto z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-auto sm:w-80 lg:w-96 max-h-[70vh] sm:max-h-[500px] flex flex-col">
          {/* Chat Header */}
          <div className="bg-blue-600 text-white p-3 sm:p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="font-medium text-sm sm:text-base">Chat with Admin</h3>
            <button onClick={toggleChat} className="text-white hover:text-blue-100">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 max-h-[50vh] sm:max-h-[300px]">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-6 sm:py-8">
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-500" />
                <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.senderType === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-2 sm:p-3 rounded-lg ${
                      msg.senderType === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <div className="text-sm">{msg.message}</div>
                    <div
                      className={`text-xs mt-1 ${
                        msg.senderType === "user" ? "text-blue-200" : "text-gray-500"
                      }`}
                    >
                      {formatTimestamp(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <form onSubmit={sendMessage} className="border-t border-gray-200 p-2 sm:p-3">
            <div className="flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-l-lg px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white placeholder:text-gray-500"
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
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
