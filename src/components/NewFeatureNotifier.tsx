"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, X, Info, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function NewFeatureNotifier() {
  const [dismissed, setDismissed] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { data: session } = useSession();
  
  // Only show for admin and superadmin users
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin";
  
  useEffect(() => {
    // Only check localStorage once the component is mounted and user session is available
    if (isAdmin && !isInitialized) {
      try {
        const announcementFeatureDismissed = localStorage.getItem("announcementFeatureDismissed");
        console.log("NewFeatureNotifier: Checking localStorage, dismissed =", announcementFeatureDismissed);
        
        if (!announcementFeatureDismissed || announcementFeatureDismissed !== "true") {
          console.log("NewFeatureNotifier: Showing notification");
          setDismissed(false);
        } else {
          console.log("NewFeatureNotifier: Notification previously dismissed");
          setDismissed(true);
        }
      } catch (error) {
        console.error("NewFeatureNotifier: Error accessing localStorage:", error);
        setDismissed(false); // Show by default if localStorage fails
      }
      setIsInitialized(true);
    } else if (!isAdmin && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isAdmin, isInitialized]);
  
  if (dismissed || !isAdmin || !isInitialized) return null;
  
  const handleDismiss = (permanent = false) => {
    console.log("NewFeatureNotifier: Dismissing notification, permanent =", permanent);
    setDismissed(true);
    
    if (permanent) {
      try {
        localStorage.setItem("announcementFeatureDismissed", "true");
        console.log("NewFeatureNotifier: Set localStorage announcementFeatureDismissed = true");
        
        // Verify it was set correctly
        const check = localStorage.getItem("announcementFeatureDismissed");
        console.log("NewFeatureNotifier: Verification check, localStorage value =", check);
      } catch (error) {
        console.error("NewFeatureNotifier: Error setting localStorage:", error);
      }
    }
  };
  
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl border border-blue-200 max-w-xl w-full overflow-hidden animate-slideUp">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-yellow-300" />
            New Feature Available!
          </h3>
          <button 
            onClick={() => handleDismiss(false)} 
            className="text-white/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <h4 className="font-medium text-lg text-gray-900 mb-2">
            Announcements System
          </h4>
          <p className="text-gray-600 mb-4">
            You can now create and manage important announcements that will be displayed to all users at the top of the application.
          </p>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              href="/admin/announcements"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Info className="mr-1.5 h-4 w-4" />
              Try It Now
            </Link>
            
            <Link
              href="/help/announcements"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Learn More
            </Link>
            
            <button
              onClick={() => handleDismiss(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
