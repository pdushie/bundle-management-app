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
  
  const fetchAnnouncements = useCallback(async () => {
    try {
      console.log("Fetching announcements...");
      
      // Update last fetch time
      setLastFetchTime(getCurrentTimestampSync());
      
      // Try the admin endpoint first with more robust error handling
      try {
        const adminResponse = await fetch("/api/admin/announcements?activeOnly=true", {
          method: "GET",
          headers: {
            "Accept": "application/json"
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
        } else {
          console.log("Admin endpoint failed:", adminResponse.status, adminResponse.statusText);
        }
      } catch (adminError) {
        console.error("Error with admin announcements endpoint:", adminError);
      }
      
      // If admin endpoint fails, try the public endpoint
      try {
        const publicResponse = await fetch("/api/announcements", {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });
        
        if (publicResponse.ok) {
          const contentType = publicResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await publicResponse.json();
            if (data.announcements && data.announcements.length > 0) {
              console.log("Public announcements data received:", data);
              // Filter out inactive announcements immediately on client side
              const activeAnnouncements = data.announcements.filter((ann: Announcement) => ann.isActive === true);
              setAnnouncements(activeAnnouncements);
            }
          } else {
            console.log("Public endpoint returned non-JSON response:", contentType);
          }
        } else {
          console.error("Public endpoint failed:", publicResponse.status, publicResponse.statusText);
        }
      } catch (publicError) {
        console.error("Error with public announcements endpoint:", publicError);
      }
      
    } catch (error) {
      console.error("Error in announcement fetching process:", error);
    }
  }, []);

  // Setup window focus/blur detection for dynamic polling
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      // Fetch immediately when window gains focus
      fetchAnnouncements();
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
  }, [fetchAnnouncements]);

  // Setup polling and rotation effects
  useEffect(() => {
    // Initial fetch
    fetchAnnouncements();
    
    // Setup dynamic polling for new announcements
    const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
    
    // Dynamic polling intervals based on user role and window focus:
    // - Admins (focused): 3 seconds (very frequent for immediate feedback)
    // - Admins (unfocused): 10 seconds 
    // - Users (focused): 15 seconds
    // - Users (unfocused): 30 seconds (balanced between responsiveness and server load)
    let pollingInterval;
    if (isAdmin) {
      pollingInterval = isWindowFocused ? 3000 : 10000;
    } else {
      pollingInterval = isWindowFocused ? 15000 : 30000;
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

  // Setup rotation effect for multiple announcements
  useEffect(() => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
    }
    
    if (announcements.length > 1) {
      rotationIntervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
      }, 8000);
    }

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [announcements.length]);

  // Don't show anything if there are no announcements
  if (announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  
  // Additional safety check: Don't show if current announcement is inactive
  if (!currentAnnouncement || !currentAnnouncement.isActive) {
    return null;
  }
  
  const typeStyle = typeStyles[currentAnnouncement.type] || typeStyles.info;
  const icon = typeIcons[currentAnnouncement.type] || typeIcons.info;

  return (
    <div className="w-full sticky top-0 z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAnnouncement.id}
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
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: Math.max(15, currentAnnouncement.message.length / 8),
                  ease: "linear",
                },
              }}
              className="font-bold text-lg"
            >
              {currentAnnouncement.message}
            </motion.div>
            {announcements.length > 1 && (
              <span className="text-sm font-medium ml-4 bg-white bg-opacity-30 px-2 py-1 rounded-full">
                {currentIndex + 1}/{announcements.length}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
