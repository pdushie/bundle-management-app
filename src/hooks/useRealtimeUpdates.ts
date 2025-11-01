import { useEffect, useState, useMemo, useRef } from 'react';
import { useSSE } from './useSSE';

interface ChatSSEData {
  type: 'new_message' | 'message_read' | 'connected' | 'heartbeat';
  message?: any;
  userId?: number;
  recipientId?: number;
  recipientType?: 'admin' | 'user';
  readBy?: 'admin' | 'user';
  messageIds?: number[];
}

interface AnnouncementSSEData {
  type: 'announcement_created' | 'announcement_updated' | 'connected' | 'heartbeat';
  announcement?: any;
}

interface UseRealtimeUpdatesOptions {
  onChatMessage?: (data: ChatSSEData) => void;
  onAnnouncementUpdate?: (data: AnnouncementSSEData) => void;
  enabled?: boolean;
  isAdminMode?: boolean; // If false, skip admin-only features like unread count fetching
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const { onChatMessage, onAnnouncementUpdate, enabled = true, isAdminMode = true } = options;
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);

  // Fetch initial unread chat count (admin only)
  const fetchUnreadChatCount = async () => {
    if (!isAdminMode) return; // Skip for non-admin users
    
    try {
      const response = await fetch('/api/chat/unread');
      if (response.ok) {
        const data = await response.json();
        setUnreadChatCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread chat count:', error);
    }
  };

  // Fetch announcements to check for updates
  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`/api/announcements?_=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // You can implement logic here to detect if there are new announcements
        // For now, we'll just trigger the callback if announcements exist
        if (onAnnouncementUpdate && data.announcements?.length > 0) {
          onAnnouncementUpdate({
            type: 'announcement_updated',
            announcement: data.announcements[0]
          });
        }
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  // Store the callbacks in refs to avoid recreating the options
  const onChatMessageRef = useRef(onChatMessage);
  const fetchUnreadChatCountRef = useRef(fetchUnreadChatCount);
  
  // Update refs when callbacks change
  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    fetchUnreadChatCountRef.current = fetchUnreadChatCount;
  }, [onChatMessage, fetchUnreadChatCount]);

  // Memoize chat SSE options to prevent unnecessary re-renders
  const chatSSEOptions = useMemo(() => ({
    onMessage: (data: any) => {
      const chatData = data as ChatSSEData;
      if (isAdminMode && chatData.type === 'new_message') {
        // Update unread count (admin only)
        setUnreadChatCount(prev => prev + 1);
      } else if (isAdminMode && chatData.type === 'message_read') {
        // Clear unread count when messages are read (admin only)
        setUnreadChatCount(0);
      }
      
      // Call user-provided callback using ref
      onChatMessageRef.current?.(chatData);
    },
    onError: (error: Event) => {
      console.error('Chat SSE connection error:', error);
      const eventSource = error.target as EventSource;
      console.error('Chat error details:', {
        type: error.type,
        url: eventSource?.url,
        readyState: eventSource?.readyState,
        timestamp: new Date().toISOString()
      });
    },
    fallbackInterval: process.env.NODE_ENV === 'production' || typeof window !== 'undefined' && window.location.hostname.includes('vercel') ? 3000 : 30000, // 3s in production, 30s in dev
    fallbackCallback: isAdminMode ? () => fetchUnreadChatCountRef.current() : undefined
  }), []); // Empty dependency array - options should never change

  // Chat SSE connection
  const { connectionStatus: chatConnectionStatus } = useSSE(
    enabled ? '/api/chat/events' : '',
    chatSSEOptions
  );

  // Store the callbacks in refs to avoid recreating the options
  const onAnnouncementUpdateRef = useRef(onAnnouncementUpdate);
  const fetchAnnouncementsRef = useRef(fetchAnnouncements);
  
  // Update refs when callbacks change
  useEffect(() => {
    onAnnouncementUpdateRef.current = onAnnouncementUpdate;
    fetchAnnouncementsRef.current = fetchAnnouncements;
  }, [onAnnouncementUpdate, fetchAnnouncements]);

  // Memoize announcements SSE options to prevent unnecessary re-renders
  const announcementSSEOptions = useMemo(() => ({
    onMessage: (data: any) => {
      const announcementData = data as AnnouncementSSEData;
      if (announcementData.type === 'announcement_created' || announcementData.type === 'announcement_updated') {
        setHasNewAnnouncements(true);
        
        // Auto-reset the flag after a short delay
        setTimeout(() => {
          setHasNewAnnouncements(false);
        }, 5000);
      }
      
      // Call user-provided callback using ref
      onAnnouncementUpdateRef.current?.(announcementData);
    },
    onError: (error: Event) => {
      console.error('Announcements SSE connection error:', error);
      const eventSource = error.target as EventSource;
      console.error('Error details:', {
        type: error.type,
        url: eventSource?.url,
        readyState: eventSource?.readyState,
        timestamp: new Date().toISOString()
      });
    },
    fallbackInterval: process.env.NODE_ENV === 'production' || typeof window !== 'undefined' && window.location.hostname.includes('vercel') ? 15000 : 60000, // 15s in production, 60s in dev
    fallbackCallback: () => fetchAnnouncementsRef.current()
  }), []); // Empty dependency array - options should never change

  // Announcements SSE connection
  const { connectionStatus: announcementConnectionStatus } = useSSE(
    enabled ? '/api/announcements/events' : '',
    announcementSSEOptions
  );

  // Initial data fetch
  useEffect(() => {
    if (enabled) {
      if (isAdminMode) {
        fetchUnreadChatCount();
      }
      fetchAnnouncements();
    }
  }, [enabled, isAdminMode]);

  return {
    unreadChatCount,
    hasNewAnnouncements,
    chatConnectionStatus,
    announcementConnectionStatus,
    refreshUnreadCount: fetchUnreadChatCount,
    refreshAnnouncements: fetchAnnouncements
  };
}