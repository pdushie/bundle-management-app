"use client";

import React, { useState } from 'react';
import { simulateNewOrders, testNotificationSystem } from '../lib/testUtils';
import { useOrderCount } from '../lib/orderContext';

/**
 * A component for testing notification functionality
 * This allows simulating new orders and testing sound/browser notifications
 */
export default function NotificationTester() {
  const [notificationStatus, setNotificationStatus] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [customOrderCount, setCustomOrderCount] = useState<number>(0);
  const [customProcessedCount, setCustomProcessedCount] = useState<number>(0);
  const [customSentCount, setCustomSentCount] = useState<number>(0);
  const { 
    orderCount, 
    processedOrderCount, 
    sentOrderCount, 
    refreshOrderCount,
    lastUpdated
  } = useOrderCount();

  // Request notification permissions
  const requestPermissions = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationStatus(`Notification permission: ${permission}`);
      } else {
        setNotificationStatus('Notifications not supported in this browser');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setNotificationStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test the notification system (sound and browser notifications)
  const runNotificationTest = async () => {
    try {
      const result = testNotificationSystem();
      setTestResult(result);
    } catch (error) {
      console.error('Error testing notifications:', error);
      setTestResult({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  // Simulate new pending orders coming in
  const simulateNewPendingOrders = async () => {
    try {
      await simulateNewOrders({ orderCount: customOrderCount });
      setNotificationStatus(`Simulated ${customOrderCount} new pending orders`);
    } catch (error) {
      console.error('Error simulating new orders:', error);
      setNotificationStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Simulate new processed orders
  const simulateNewProcessedOrders = async () => {
    try {
      await simulateNewOrders({ processedCount: customProcessedCount });
      setNotificationStatus(`Simulated ${customProcessedCount} new processed orders`);
    } catch (error) {
      console.error('Error simulating processed orders:', error);
      setNotificationStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Simulate new sent orders
  const simulateNewSentOrders = async () => {
    try {
      await simulateNewOrders({ sentCount: customSentCount });
      setNotificationStatus(`Simulated ${customSentCount} new sent orders`);
    } catch (error) {
      console.error('Error simulating sent orders:', error);
      setNotificationStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle count input changes
  const handleOrderCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCustomOrderCount(isNaN(value) ? 0 : Math.max(0, value));
  };

  const handleProcessedCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCustomProcessedCount(isNaN(value) ? 0 : Math.max(0, value));
  };

  const handleSentCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCustomSentCount(isNaN(value) ? 0 : Math.max(0, value));
  };

  // Force refresh the order counts
  const forceRefresh = async () => {
    try {
      await refreshOrderCount();
      setNotificationStatus('Force refreshed order counts');
    } catch (error) {
      console.error('Error refreshing order counts:', error);
      setNotificationStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Notification Test Panel</h2>
      
      <div className="mb-4 p-3 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Current Counts:</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-blue-100 p-2 rounded text-center">
            <div className="font-bold text-lg">{orderCount}</div>
            <div className="text-sm">Pending Orders</div>
          </div>
          <div className="bg-green-100 p-2 rounded text-center">
            <div className="font-bold text-lg">{processedOrderCount}</div>
            <div className="text-sm">Processed Orders</div>
          </div>
          <div className="bg-purple-100 p-2 rounded text-center">
            <div className="font-bold text-lg">{sentOrderCount}</div>
            <div className="text-sm">Sent Orders</div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <h3 className="font-medium">Notification Controls:</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            onClick={requestPermissions}
          >
            Request Permissions
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
            onClick={runNotificationTest}
          >
            Test Sound & Notification
          </button>
          <button
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
            onClick={forceRefresh}
          >
            Force Refresh Counts
          </button>
        </div>
      </div>
      
      <div className="space-y-4 mb-4">
        <h3 className="font-medium">Simulate Events:</h3>
        
        <div className="flex items-center gap-2">
          <div className="w-24">
            <input
              type="number"
              min="0"
              value={customOrderCount}
              onChange={handleOrderCountChange}
              className="w-full px-2 py-1 border rounded text-center"
            />
          </div>
          <button
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
            onClick={simulateNewPendingOrders}
          >
            Simulate {customOrderCount === 0 ? 'Zero' : 'New'} Order{customOrderCount !== 1 ? 's' : ''}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-24">
            <input
              type="number"
              min="0"
              value={customProcessedCount}
              onChange={handleProcessedCountChange}
              className="w-full px-2 py-1 border rounded text-center"
            />
          </div>
          <button
            className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition"
            onClick={simulateNewProcessedOrders}
          >
            Simulate {customProcessedCount === 0 ? 'Zero' : ''} Processed Order{customProcessedCount !== 1 ? 's' : ''}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-24">
            <input
              type="number"
              min="0"
              value={customSentCount}
              onChange={handleSentCountChange}
              className="w-full px-2 py-1 border rounded text-center"
            />
          </div>
          <button
            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
            onClick={simulateNewSentOrders}
          >
            Simulate {customSentCount === 0 ? 'Zero' : ''} Sent Order{customSentCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
      
      {notificationStatus && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-medium">Status:</h3>
          <p>{notificationStatus}</p>
        </div>
      )}
      
      {testResult && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <h3 className="font-medium">Test Results:</h3>
          <pre className="text-xs mt-1 overflow-auto max-h-40">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
