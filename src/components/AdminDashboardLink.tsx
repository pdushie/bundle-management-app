"use client";

import { useSession } from "next-auth/react";
import { Shield, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function AdminDashboardLink() {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  
  // Animation effect on mount
  useEffect(() => {
    // Delay appearance for a smoother experience
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Only show the link for users with admin or superadmin role
  if (!session?.user?.role || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return null;
  }
  
  return (
    <div className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <Link 
        href="/admin"
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title={session.user.role === "superadmin" ? "Access Admin Dashboard (Superadmin)" : "Access Admin Dashboard"}
      >
        <Shield className="h-5 w-5" />
        <span className="font-medium hidden sm:inline">Admin Dashboard</span>
        <span className="font-medium sm:hidden">Admin</span>
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}
