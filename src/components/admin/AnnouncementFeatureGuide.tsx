"use client";

import React, { useState } from "react";
import { X, Info, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AnnouncementFeatureGuide() {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Info className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-blue-800">New Feature: Announcements System</h3>
          <div className="mt-2 text-sm text-blue-700">
            <p className="mb-2">
              Welcome to the new Announcements Management system! This feature allows you to create and manage important announcements that will be displayed to all users at the top of the application.
            </p>
            
            <h4 className="font-medium mt-3 mb-1">Quick Start Guide:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create a new announcement using the "Add Announcement" button</li>
              <li>Select announcement type (info, warning, or error) based on urgency</li>
              <li>Set start and end dates to schedule when announcements appear</li>
              <li>Activate/deactivate announcements as needed</li>
              <li>Announcements will appear in a scrolling banner at the top of the application</li>
            </ul>
            
            <div className="mt-4 flex gap-3">
              <Link 
                href="/help/announcements" 
                className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm leading-5 font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue transition"
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                View Full Guide
              </Link>
              <button 
                onClick={() => setDismissed(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:border-gray-400 focus:shadow-outline-gray transition"
              >
                <X className="mr-1.5 h-4 w-4" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
