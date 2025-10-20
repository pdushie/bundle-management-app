"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

export default function AdminChatNotifier() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notificationSound] = useState<HTMLAudioElement | null>(
    typeof Audio !== 'undefined' ? new Audio('/notification-sound.mp3') : null
  );

  // Don't run checks if we're already on the chat page
  const isOnChatPage = pathname === '/admin/chat';

  // Check for new messages regularly
  useEffect(() => {
    // Skip if session is still loading
    if (status === 'loading') {
      return;
    }

    // Skip if not authenticated or not admin/superadmin or already on chat page
    if (status !== 'authenticated' || 
        !session?.user || 
        (session.user.role !== 'admin' && session.user.role !== 'superadmin') ||
        isOnChatPage) {
      return;
    }

    // Function to fetch unread message count
    const checkForNewMessages = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      
      // Create an AbortController for timeout (more compatible than AbortSignal.timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch('/api/chat/unread', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Only log error if it's not a 401/403 (authentication/authorization)
          if (response.status !== 401 && response.status !== 403) {
            console.error("Failed to fetch unread messages count:", response.status);
          }
          return;
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Invalid response type from chat unread endpoint");
          return;
        }
        
        const data = await response.json();
        
        if (data.success) {
          // If we've received new messages, show notification and play sound
          if (data.unreadCount > unreadCount && unreadCount > 0) {
            setHasNewMessages(true);
            // Play notification sound
            notificationSound?.play().catch(err => {
              console.log('Error playing notification:', err);
            });
          }
          
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn("Chat unread request timed out");
        } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.warn("Network error fetching chat unread count - server may be starting up");
        } else {
          console.error("Error checking for new messages:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Check immediately on mount
    checkForNewMessages();
    
    // Then check every 15 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForNewMessages();
      }
    }, 15000);

    // Listen for visibility changes to refresh when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForNewMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, status, unreadCount, isOnChatPage, notificationSound, isLoading]);

  // Don't render anything if loading, not authenticated, non-admins, or if on chat page already
  if (status === 'loading' ||
      status !== 'authenticated' ||
      !session?.user || 
      (session.user.role !== 'admin' && session.user.role !== 'superadmin') ||
      isOnChatPage || 
      unreadCount === 0) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full shadow-lg 
        ${hasNewMessages ? 'bg-red-500 animate-bounce' : 'bg-blue-600'} 
        text-white flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105`}
      onClick={() => {
        window.location.href = '/admin/chat';
      }}
    >
      <Bell className="h-5 w-5" />
      <span className="font-medium">{unreadCount} {unreadCount === 1 ? 'new message' : 'new messages'}</span>
    </div>
  );
}
