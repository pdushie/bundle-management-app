"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getOrderCounts } from './orderClient';
import { 
  ORDER_UPDATED_EVENT, 
  ORDER_PROCESSED_EVENT, 
  ORDER_SENT_EVENT, 
  COUNT_UPDATED_EVENT,
  notifyCountUpdated 
} from './orderNotifications';

// Define the context type
interface OrderContextType {
  orderCount: number;
  processedOrderCount: number;
  sentOrderCount: number;
  refreshOrderCount: () => Promise<void>;
  isLoading: boolean;
  lastUpdated: number;
}

// Create the context with default values
const OrderContext = createContext<OrderContextType>({
  orderCount: 0,
  processedOrderCount: 0,
  sentOrderCount: 0,
  refreshOrderCount: async () => {},
  isLoading: false,
  lastUpdated: 0
});

// Custom hook for using the order context
export const useOrderCount = () => useContext(OrderContext);

// Define props for the provider component
interface OrderProviderProps {
  children: ReactNode;
}

// Create the provider component
export const OrderProvider = ({ children }: OrderProviderProps) => {
  const [orderCount, setOrderCount] = useState<number>(0);
  const [processedOrderCount, setProcessedOrderCount] = useState<number>(0);
  const [sentOrderCount, setSentOrderCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [refreshAttempts, setRefreshAttempts] = useState<number>(0);
  const { data: session } = useSession();

  // Keep track of the last time we refreshed to avoid too many refreshes
  const lastRefreshRef = React.useRef<number>(0);
  
  // Function to refresh all order counts - using useCallback to maintain stable reference
  const refreshOrderCount = useCallback(async () => {
    // Throttle refreshes to prevent flooding
    const now = Date.now();
    const minRefreshInterval = 500; // 500ms minimum between refreshes
    
    if (now - lastRefreshRef.current < minRefreshInterval) {
      console.log('Throttling refresh - too soon since last refresh');
      return;
    }
    
    lastRefreshRef.current = now;
    
    try {
      setIsLoading(true);
      const userEmail = session?.user?.email || undefined;
      
      console.log(`Refreshing order counts for user: ${userEmail || 'none'} (attempt ${refreshAttempts + 1})`);
      
      const counts = await getOrderCounts(userEmail);
      
      console.log('Received order counts:', counts);
      
      // Only update state if the counts actually changed to minimize re-renders
      if (counts.pendingCount !== orderCount || 
          counts.processedCount !== processedOrderCount || 
          counts.userOrderCount !== sentOrderCount) {
            
        console.log('Counts changed, updating state');
        setOrderCount(counts.pendingCount);
        setProcessedOrderCount(counts.processedCount);
        setSentOrderCount(counts.userOrderCount);
        setLastUpdated(Date.now());
        
        // Reset refresh attempts on successful update
        setRefreshAttempts(0);
        
        console.log('Updated order counts in context - Pending:', counts.pendingCount, 
                   'Processed:', counts.processedCount, 'Sent:', counts.userOrderCount);
      } else {
        console.log('No change in counts, state not updated');
      }
    } catch (error) {
      console.error('Error refreshing order counts:', error);
      
      // Increment refresh attempts
      setRefreshAttempts(prev => prev + 1);
      
      // Only reset to default values after multiple failed attempts
      if (refreshAttempts > 3) {
        console.warn('Multiple refresh failures, resetting counts to zero');
        setOrderCount(0);
        setProcessedOrderCount(0);
        setSentOrderCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session, orderCount, processedOrderCount, sentOrderCount, refreshAttempts]);

  // Set up listeners for all event types
  useEffect(() => {
    console.log('Setting up event listeners for order updates');
    
    // Get initial count
    refreshOrderCount();

    // Create event handlers for each event type
    const handleOrderUpdate = (event: Event) => {
      console.log('ORDER_UPDATED_EVENT received in context');
      if ((event as CustomEvent)?.detail) {
        console.log('With details:', (event as CustomEvent).detail);
      }
      refreshOrderCount();
    };
    
    const handleOrderProcessed = (event: Event) => {
      console.log('ORDER_PROCESSED_EVENT received in context');
      if ((event as CustomEvent)?.detail) {
        console.log('With details:', (event as CustomEvent).detail);
      }
      refreshOrderCount();
    };
    
    const handleOrderSent = (event: Event) => {
      console.log('ORDER_SENT_EVENT received in context');
      if ((event as CustomEvent)?.detail) {
        console.log('With details:', (event as CustomEvent).detail);
      }
      refreshOrderCount();
    };
    
    const handleCountUpdate = () => {
      console.log('COUNT_UPDATED_EVENT received in context');
      refreshOrderCount();
    };

    // Set up event listeners for all event types
    window.addEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    window.addEventListener(ORDER_PROCESSED_EVENT, handleOrderProcessed);
    window.addEventListener(ORDER_SENT_EVENT, handleOrderSent);
    window.addEventListener(COUNT_UPDATED_EVENT, handleCountUpdate);

    // Set up polling interval (every 15 seconds) as a fallback
    // Reduced from 30 seconds to 15 seconds for more frequent updates
    const intervalId = setInterval(() => {
      console.log('Polling interval triggered, refreshing counts');
      refreshOrderCount();
    }, 15000);

    // Clean up the event listeners and interval
    return () => {
      window.removeEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
      window.removeEventListener(ORDER_PROCESSED_EVENT, handleOrderProcessed);
      window.removeEventListener(ORDER_SENT_EVENT, handleOrderSent);
      window.removeEventListener(COUNT_UPDATED_EVENT, handleCountUpdate);
      clearInterval(intervalId);
    };
  }, [refreshOrderCount]); // Only refreshOrderCount as dependency
  
  // Additional effect to handle session changes
  useEffect(() => {
    console.log('Session changed, refreshing counts');
    refreshOrderCount();
    
    // Dispatch count update notification when session changes
    notifyCountUpdated();
  }, [session, refreshOrderCount]);

  // Create a value object with the current state
  const value = {
    orderCount,
    processedOrderCount,
    sentOrderCount,
    refreshOrderCount,
    isLoading,
    lastUpdated
  };

  // Provide the context value to children
  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

// Note: notification functions are imported from orderNotifications.ts
