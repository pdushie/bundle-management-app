"use client";

import React from 'react';
import NotificationTester from '@/components/NotificationTester';
import { OrderProvider } from '@/lib/orderContext';

/**
 * Page for testing notification functionality
 */
export default function TestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Notification System Test Page</h1>
      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">Notification Tester</h2>
          <p className="text-gray-700 mb-4">
            Use this tool to test notification badges, sounds, and browser notifications.
          </p>
          <OrderProvider>
            <NotificationTester />
          </OrderProvider>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">How to use</h2>
          <div className="bg-white p-4 rounded shadow">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click <strong>Request Permissions</strong> to grant browser notification access</li>
              <li>Click <strong>Test Sound & Notification</strong> to verify browser notifications and sound work</li>
              <li>Use the <strong>Simulate</strong> buttons to test different notification events</li>
              <li>Check that notification badges appear on the main navigation tabs</li>
              <li>Use <strong>Force Refresh</strong> to manually update the order counts</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
