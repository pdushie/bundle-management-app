"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { getCurrentTimestampSync } from "../lib/timeService";

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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasActiveAnnouncementsRef = useRef<boolean>(false);
  
  const fetchAnnouncements = useCallback(async () => {
    try {
      console.log("Fetching announcements...");
      
      // Update last fetch time
      setLastFetchTime(getCurrentTimestampSync());
      
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
                console.log("Admin announcements data received:", data);
                // Filter out inactive announcements immediately on client side
                const activeAnnouncements = data.announcements.filter((ann: Announcement) => ann.isActive === true);
                setAnnouncements(activeAnnouncements);
                return; // Successfully got announcements from admin endpoint
              }
            } else {
              console.log("Admin endpoint returned non-JSON response:", contentType);
            }
          } else if (adminResponse.status === 401 || adminResponse.status === 403) {
            console.log("Admin endpoint authentication failed, falling back to public endpoint");
          } else {
            console.log("Admin endpoint failed:", adminResponse.status, adminResponse.statusText);
          }
        } catch (adminError) {
          console.error("Error with admin announcements endpoint:", adminError);
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
              console.log("Public announcements data received:", data);
              // Filter out inactive announcements immediately on client side
              const activeAnnouncements = data.announcements.filter((ann: Announcement) => ann && ann.isActive === true);
              setAnnouncements(activeAnnouncements);
            } else {
              console.log("No valid announcements received from public endpoint");
              setAnnouncements([]);
            }
          } else {
            console.log("Public endpoint returned non-JSON response:", contentType);
            setAnnouncements([]);
          }
        } else {
          console.error("Public endpoint failed:", publicResponse.status, publicResponse.statusText);
          setAnnouncements([]);
        }
      } catch (publicError) {
        if (publicError instanceof Error && publicError.name === 'AbortError') {
          console.error("Public announcements request timed out");
        } else {
          console.error("Error with public announcements endpoint:", publicError);
        }
        setAnnouncements([]);
      }
      
    } catch (error) {
      console.error("Error in announcement fetching process:", error);
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
      console.log("Announcement change event detected, refreshing announcements...");
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

  // Setup polling and rotation effects
  useEffect(() => {
    // Initial fetch
    fetchAnnouncements();
    
    // Setup dynamic polling for new announcements
    const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
    
    // Dynamic polling intervals based on user role and window focus:
    // - Admins (focused): 2 seconds (very frequent for immediate feedback)
    // - Admins (unfocused): 5 seconds 
    // - Users (focused): 10 seconds
    // - Users (unfocused): 20 seconds (balanced between responsiveness and server load)
    let pollingInterval;
    if (isAdmin && session) {
      pollingInterval = isWindowFocused ? 2000 : 5000;
    } else {
      pollingInterval = isWindowFocused ? 10000 : 20000;
    }
    
    pollingIntervalRef.current = setInterval(() => {
      console.log(`Polling for announcement updates... (${isAdmin ? 'admin' : 'user'} mode, ${isWindowFocused ? 'focused' : 'unfocused'})`);
      fetchAnnouncements();
    }, pollingInterval);

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchAnnouncements, session?.user?.role, isWindowFocused]);

  // Controlled filtering effect to remove inactive announcements without causing loops
  useEffect(() => {
    const filterInterval = setInterval(() => {
      setAnnouncements(currentAnnouncements => {
        const activeAnnouncements = currentAnnouncements.filter(ann => ann && ann.isActive === true);
        
        // Only update if there's actually a difference
        if (activeAnnouncements.length !== currentAnnouncements.length) {
          console.log(`Filtering out ${currentAnnouncements.length - activeAnnouncements.length} inactive announcements`);
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
      console.log("No active announcements detected, clearing rotation");
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
