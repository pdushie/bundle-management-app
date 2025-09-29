"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function TabVisibilityDebugger() {
  const { data: session } = useSession();
  const [visibleTabs, setVisibleTabs] = useState([]);
  
  useEffect(() => {
    if (!session?.user) return;
    
    const isSuperAdmin = session?.user?.role === 'superadmin';
    const isAdmin = session?.user?.role === 'admin';
    const isManager = session?.user?.role === 'manager';
    const isRegularUser = session?.user?.role === 'user';
    
    // Define base tabs available to everyone
    const baseTabs = [
      { id: "bundle-allocator", name: "Bundle Allocator" },
      { id: "bundle-categorizer", name: "Bundle Categorizer" },
      { id: "send-order", name: "Send Order" },
      { id: "orders", name: "Orders" },
      { id: "processed-orders", name: "Processed Orders" },
      { id: "sent-orders", name: "My Sent Orders" },
      { id: "track-orders", name: "Track Order Status" },
      { id: "billing", name: "Billing" }
    ];

    // Add history tab for admins, superadmins and managers
    if (isSuperAdmin || isAdmin || isManager) {
      baseTabs.push({
        id: "history",
        name: "History & Analytics"
      });
    }
    
    // Filter tabs based on user role (same logic as in page.tsx)
    const filtered = baseTabs.filter(tab => {
      // Super admin users have access to all tabs
      if (isSuperAdmin) {
        return true; // Superadmins should see all tabs including history
      }
      
      // Regular users can only access send-order, sent-orders, and billing
      if (isRegularUser) {
        return tab.id === 'send-order' || tab.id === 'sent-orders' || tab.id === 'billing';
      }
      
      // Admin users can access specific tabs, including track-orders
      if (isAdmin) {
        return tab.id === 'bundle-allocator' || 
              tab.id === 'bundle-categorizer' || 
              tab.id === 'orders' || 
              tab.id === 'processed-orders' || 
              tab.id === 'track-orders' ||
              tab.id === 'history'; // Should be accessible based on our changes
      }
      
      // Managers can access all tabs
      if (isManager) {
        return true; // Managers should see all tabs
      }
      
      // Default behavior for other roles
      return tab.id !== 'history';
    });
    
    setVisibleTabs(filtered);
  }, [session]);
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-md mt-4">
      <h2 className="text-lg font-bold mb-4">Tab Visibility Simulation</h2>
      
      <div className="mb-4">
        <h3 className="font-medium mb-2">User Role: <span className="font-bold text-blue-600">{session?.user?.role || 'Not logged in'}</span></h3>
        <p className="text-sm text-gray-500">The tabs below should be visible to you based on your role</p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map(tab => (
          <div 
            key={tab.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab.id === 'history' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' : 'bg-blue-50 text-blue-600'}`}
          >
            {tab.name}
          </div>
        ))}
      </div>
      
      {visibleTabs.some(tab => tab.id === 'history') ? (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
          ✅ History tab should be visible based on your role
        </div>
      ) : (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          ❌ History tab should NOT be visible based on your role
        </div>
      )}
    </div>
  );
}
