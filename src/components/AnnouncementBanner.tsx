"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { getCurrentTimestampSync } from "../lib/timeService";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";

type Announcement = {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'error';
  isActive: boolean;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
};

const typeIcons = {
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <AlertOctagon className="h-5 w-5" />,
};

const typeStyles = {
  info: "bg-blue-100 text-blue-800 border-blue-300 border-b-2 border-blue-500",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300 border-b-2 border-yellow-500",
  error: "bg-red-100 text-red-800 border-red-300 border-b-2 border-red-500",
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const { data: session } = useSession();
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasActiveAnnouncementsRef = useRef<boolean>(false);
  
  // Use SSE for realtime announcement updates
  const { hasNewAnnouncements, refreshAnnouncements } = useRealtimeUpdates({
    enabled: true // Always enabled for announcements since they're public
  });
  
  const fetchAnnouncements = useCallback(async () => {
    try {
      // Add client-side cache to prevent redundant requests (5 minutes)
      const now = getCurrentTimestampSync();
      if (lastFetchTime && (now - lastFetchTime) < 300000) {
        // // Console log removed for security
        return;
      }
      
      // // Console log removed for security
      
      // Update last fetch time
      setLastFetchTime(now);
      
      // Try the admin endpoint first only if user is authenticated and has admin role
      const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
      
      if (session && isAdmin) {
        try {
          const cacheBuster = Date.now();
          const adminResponse = await fetch(`/api/admin/announcements?activeOnly=true&_=${cacheBuster}`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache"
            }
          });
          
          if (adminResponse.ok) {
            const contentType = adminResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await adminResponse.json();
              if (data.announcements && data.announcements.length > 0) {
                // // Console log removed for security
                // Filter out inactive announcements immediately on client side
                const activeAnnouncements = data.announcements.filter((ann: Announcement) => ann.isActive === true);
                setAnnouncements(activeAnnouncements);
                return; // Successfully got announcements from admin endpoint
              }
            } else {
              // // Console log removed for security
            }
          } else if (adminResponse.status === 401 || adminResponse.status === 403) {
            // // Console log removed for security
          } else {
            // Console log removed for security
          }
        } catch (adminError) {
          // Console statement removed for security
        }
      }
      
      // Try the public endpoint (always available, no authentication required)
      try {
        const cacheBuster = Date.now();
        const publicResponse = await fetch(`/api/announcements?_=${cacheBuster}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (publicResponse.ok) {
          const contentType = publicResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await publicResponse.json();
            if (data.announcements && Array.isArray(data.announcements)) {
              // Console log removed for security
              // Filter out inactive announcements immediately on client side
              const activeAnnouncements = data.announcements.filter((ann: Announcement) => ann && ann.isActive === true);
              setAnnouncements(activeAnnouncements);
            } else {
              // No valid announcements received from public endpoint - logging removed for security
              setAnnouncements([]);
            }
          } else {
            // Console log removed for security
            setAnnouncements([]);
          }
        } else {
          // Console statement removed for security
          setAnnouncements([]);
        }
      } catch (publicError) {
        if (publicError instanceof Error && publicError.name === 'AbortError') {
          // Console statement removed for security
        } else {
          // Console statement removed for security
        }
        setAnnouncements([]);
      }
      
    } catch (error) {
      // Console statement removed for security
    }
  }, []);

  // Setup window focus/blur detection for dynamic polling and announcement change events
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      // Fetch immediately when window gains focus
      fetchAnnouncements();
    };
    
    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    // Listen for custom announcement change events with controlled refresh
    const handleAnnouncementChange = () => {
      // Console log removed for security
      // Clear rotation intervals
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      // Reset index and fetch new announcements
      setCurrentIndex(0);
      fetchAnnouncements();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('announcementChanged', handleAnnouncementChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('announcementChanged', handleAnnouncementChange);
    };
  }, [fetchAnnouncements]);

  // Initial fetch - SSE will handle updates
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Controlled filtering effect to remove inactive announcements without causing loops
  useEffect(() => {
    const filterInterval = setInterval(() => {
      setAnnouncements(currentAnnouncements => {
        const activeAnnouncements = currentAnnouncements.filter(ann => ann && ann.isActive === true);
        
        // Only update if there's actually a difference
        if (activeAnnouncements.length !== currentAnnouncements.length) {
          // Console log removed for security
          return activeAnnouncements;
        }
        return currentAnnouncements;
      });
    }, 500); // Use 500ms to avoid excessive updates

    return () => clearInterval(filterInterval);
  }, []);

  // Effect to handle announcement state changes with controlled updates
  useEffect(() => {
    const activeAnnouncements = announcements.filter(ann => ann && ann.isActive === true);
    const hasActive = activeAnnouncements.length > 0;
    
    // Update the ref
    hasActiveAnnouncementsRef.current = hasActive;
    
    // Clear existing rotation interval
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
    
    // Handle different cases based on active announcements
    if (!hasActive) {
      // Console log removed for security
      if (currentIndex !== 0) {
        setCurrentIndex(0);
      }
      return;
    }
    
    // Setup rotation for multiple announcements
    if (activeAnnouncements.length > 1) {
      rotationIntervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % activeAnnouncements.length);
      }, 8000);
    } else if (activeAnnouncements.length === 1 && currentIndex !== 0) {
      // Reset to 0 if only one active announcement
      setCurrentIndex(0);
    }

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [announcements, currentIndex]);

  // Handle index adjustment in useEffect to avoid hook order issues with strict filtering
  const activeAnnouncements = announcements.filter(ann => ann && ann.isActive === true);
  const adjustedIndex = currentIndex >= activeAnnouncements.length ? 0 : currentIndex;
  const currentAnnouncement = activeAnnouncements[adjustedIndex];
  
  // Update currentIndex if it was adjusted (using useEffect to avoid infinite renders)
  useEffect(() => {
    if (adjustedIndex !== currentIndex && activeAnnouncements.length > 0) {
      setCurrentIndex(adjustedIndex);
    }
  }, [adjustedIndex, currentIndex, activeAnnouncements.length]);
  
  // Strict checking: Return null after all hooks have been called
  // Multiple checks to ensure we never show inactive announcements
  if (activeAnnouncements.length === 0 || 
      !currentAnnouncement || 
      currentAnnouncement.isActive !== true ||
      !announcements.length ||
      announcements.every(ann => !ann || ann.isActive !== true)) {
    return null;
  }
  
  const typeStyle = typeStyles[currentAnnouncement.type] || typeStyles.info;
  const icon = typeIcons[currentAnnouncement.type] || typeIcons.info;

  return (
    <div className="w-full sticky top-0 z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentAnnouncement.id}-${currentAnnouncement.isActive}`}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`w-full py-3 px-4 border-b ${typeStyle} flex items-center justify-center shadow-md`}
        >
          <div className="flex items-center space-x-3 overflow-hidden whitespace-nowrap">
            <span className="flex-shrink-0">
              <span className="h-6 w-6">{icon}</span>
            </span>
            <motion.div 
              key={`scroll-${currentAnnouncement.id}-${currentAnnouncement.isActive}`}
              initial={{ x: "100%" }}
              animate={currentAnnouncement.isActive ? { x: "-100%" } : { x: "100%" }}
              transition={currentAnnouncement.isActive ? {
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: Math.max(15, currentAnnouncement.message.length / 8),
                  ease: "linear",
                },
              } : { duration: 0.3 }}
              className="font-bold text-lg"
            >
              {currentAnnouncement.message}
            </motion.div>
            {activeAnnouncements.length > 1 && (
              <span className="text-sm font-medium ml-4 bg-white bg-opacity-30 px-2 py-1 rounded-full">
                {adjustedIndex + 1}/{activeAnnouncements.length}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


