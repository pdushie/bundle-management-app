"use client";

import { useSession } from "next-auth/react";
import { Shield, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

export default function AdminDashboardLink() {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch unread chat count
  const fetchUnreadChatCount = useCallback(async () => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return;
    }
    
    try {
      setIsLoadingChat(true);
      const response = await fetch("/api/chat/unread", {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadChatCount(data.unreadCount || 0);
        }
      } else {
        console.error("Failed to fetch unread chat count:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching unread chat count:", error);
    } finally {
      setIsLoadingChat(false);
    }
  }, [session?.user]);
  
  // Animation effect on mount
  useEffect(() => {
    // Delay appearance for a smoother experience
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Setup window focus detection for immediate chat updates
  useEffect(() => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return;
    }
    
    const handleFocus = () => {
      setIsWindowFocused(true);
      // Fetch chat count immediately when window gains focus
      fetchUnreadChatCount();
    };
    
    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [fetchUnreadChatCount, session?.user]);

  // Setup chat polling for admins
  useEffect(() => {
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return;
    }
    
    // Initial fetch
    fetchUnreadChatCount();
    
    // Dynamic polling based on window focus:
    // - Focused: 10 seconds (frequent for active admins)
    // - Unfocused: 30 seconds (reduced server load when not active)
    const pollingInterval = isWindowFocused ? 10000 : 30000;
    
    pollingIntervalRef.current = setInterval(() => {
      fetchUnreadChatCount();
    }, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchUnreadChatCount, session?.user, isWindowFocused]);
  
  // Only show the link for users with admin or superadmin role
  if (!session?.user?.role || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return null;
  }
  
  return (
    <div className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="relative">
        <Link 
          href="/admin"
          className={`flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
            unreadChatCount > 0 ? 'ring-2 ring-red-400 ring-opacity-75 animate-pulse' : ''
          }`}
          title={
            unreadChatCount > 0 
              ? `Access Admin Dashboard - ${unreadChatCount} unread message${unreadChatCount !== 1 ? 's' : ''}` 
              : (session.user.role === "superadmin" ? "Access Admin Dashboard (Superadmin)" : "Access Admin Dashboard")
          }
        >
          <Shield className="h-5 w-5" />
          <span className="font-medium hidden sm:inline">Admin Dashboard</span>
          <span className="font-medium sm:hidden">Admin</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
        
        {/* Chat Notification Badge */}
        {unreadChatCount > 0 && (
          <div className="absolute -top-2 -right-2 flex items-center justify-center">
            <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg ring-2 ring-white animate-pulse">
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </div>
            <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
          </div>
        )}
        
        {/* Chat Icon Indicator (subtle) */}
        {unreadChatCount > 0 && (
          <div className="absolute -top-1 -left-1 bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
            <MessageCircle className="h-2 w-2 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
