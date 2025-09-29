"use client";

// Constants for localStorage keys
const UNREAD_PENDING_ORDERS_KEY = 'unread_pending_orders';
const UNREAD_PROCESSED_ORDERS_KEY = 'unread_processed_orders';
const UNREAD_SENT_ORDERS_KEY = 'unread_sent_orders';
const LAST_ACTIVE_TAB_KEY = 'last_active_tab';
const LAST_ORDER_COUNT_KEY = 'last_order_count';
const LAST_PROCESSED_COUNT_KEY = 'last_processed_count';
const LAST_SENT_COUNT_KEY = 'last_sent_count';

/**
 * Utility to track unread order counts across tab navigations
 */
export const orderTrackingUtils = {
  // Store the current active tab
  setActiveTab: (tabId: string): void => {
    try {
      localStorage.setItem(LAST_ACTIVE_TAB_KEY, tabId);
      
      // When navigating to a tab, clear its unread count
      if (tabId === 'orders') {
        orderTrackingUtils.clearUnreadPendingOrders();
      } else if (tabId === 'processed-orders') {
        orderTrackingUtils.clearUnreadProcessedOrders();
      } else if (tabId === 'sent-orders') {
        orderTrackingUtils.clearUnreadSentOrders();
      }
    } catch (error) {
      console.error('Error setting active tab in localStorage:', error);
    }
  },
  
  // Get the last active tab
  getLastActiveTab: (): string => {
    try {
      return localStorage.getItem(LAST_ACTIVE_TAB_KEY) || '';
    } catch (error) {
      console.error('Error getting last active tab from localStorage:', error);
      return '';
    }
  },
  
  // Update order counts and calculate unread counts
  updateOrderCounts: (
    currentPendingCount: number,
    currentProcessedCount: number, 
    currentSentCount: number
  ): { hasNewPending: boolean, hasNewProcessed: boolean, hasNewSent: boolean } => {
    try {
      // Ensure counts are valid numbers
      const safePendingCount = isNaN(currentPendingCount) ? 0 : currentPendingCount;
      const safeProcessedCount = isNaN(currentProcessedCount) ? 0 : currentProcessedCount;
      const safeSentCount = isNaN(currentSentCount) ? 0 : currentSentCount;
      
      // Get the previous counts
      const lastPendingCount = Number(localStorage.getItem(LAST_ORDER_COUNT_KEY) || '0');
      const lastProcessedCount = Number(localStorage.getItem(LAST_PROCESSED_COUNT_KEY) || '0');
      const lastSentCount = Number(localStorage.getItem(LAST_SENT_COUNT_KEY) || '0');
      
      // Debug log the counts
      console.log('Order tracking counts:', {
        currentPending: safePendingCount,
        lastPending: lastPendingCount,
        currentProcessed: safeProcessedCount,
        lastProcessed: lastProcessedCount,
        currentSent: safeSentCount,
        lastSent: lastSentCount
      });
      
      // Update the stored counts
      localStorage.setItem(LAST_ORDER_COUNT_KEY, String(safePendingCount));
      localStorage.setItem(LAST_PROCESSED_COUNT_KEY, String(safeProcessedCount));
      localStorage.setItem(LAST_SENT_COUNT_KEY, String(safeSentCount));
      
      // Check if we have new orders
      const hasNewPending = safePendingCount > lastPendingCount;
      const hasNewProcessed = safeProcessedCount > lastProcessedCount;
      const hasNewSent = safeSentCount > lastSentCount;
      
      // Update unread counts if we're not on the respective tabs
      const activeTab = orderTrackingUtils.getLastActiveTab();
      
      if (hasNewPending && activeTab !== 'orders') {
        const currentUnread = orderTrackingUtils.getUnreadPendingOrders();
        const newUnread = currentUnread + (safePendingCount - lastPendingCount);
        orderTrackingUtils.setUnreadPendingOrders(newUnread);
        console.log(`Updated unread pending: ${currentUnread} -> ${newUnread}`);
      } else if (safePendingCount > 0 && lastPendingCount === 0) {
        // Don't automatically set unread counts on initialization
        // This ensures we start with zero unread counts
        console.log(`Detected initial pending orders (${safePendingCount}), maintaining unread at 0`);
      }
      
      if (hasNewProcessed && activeTab !== 'processed-orders') {
        const currentUnread = orderTrackingUtils.getUnreadProcessedOrders();
        const newUnread = currentUnread + (safeProcessedCount - lastProcessedCount);
        orderTrackingUtils.setUnreadProcessedOrders(newUnread);
        console.log(`Updated unread processed: ${currentUnread} -> ${newUnread}`);
      } else if (safeProcessedCount > 0 && lastProcessedCount === 0) {
        // Don't automatically set unread counts on initialization
        // This ensures we start with zero unread counts
        console.log(`Detected initial processed orders (${safeProcessedCount}), maintaining unread at 0`);
      }
      
      if (hasNewSent && activeTab !== 'sent-orders') {
        const currentUnread = orderTrackingUtils.getUnreadSentOrders();
        const newUnread = currentUnread + (safeSentCount - lastSentCount);
        orderTrackingUtils.setUnreadSentOrders(newUnread);
        console.log(`Updated unread sent: ${currentUnread} -> ${newUnread}`);
      } else if (safeSentCount > 0 && lastSentCount === 0) {
        // Don't automatically set unread counts on initialization
        // This ensures we start with zero unread counts
        console.log(`Detected initial sent orders (${safeSentCount}), maintaining unread at 0`);
      }
      
      return { hasNewPending, hasNewProcessed, hasNewSent };
    } catch (error) {
      console.error('Error updating order counts in localStorage:', error);
      return { hasNewPending: false, hasNewProcessed: false, hasNewSent: false };
    }
  },
  
  // Get unread pending orders count
  getUnreadPendingOrders: (): number => {
    try {
      return Number(localStorage.getItem(UNREAD_PENDING_ORDERS_KEY) || '0');
    } catch (error) {
      console.error('Error getting unread pending orders from localStorage:', error);
      return 0;
    }
  },
  
  // Set unread pending orders count
  setUnreadPendingOrders: (count: number): void => {
    try {
      localStorage.setItem(UNREAD_PENDING_ORDERS_KEY, String(Math.max(0, count)));
    } catch (error) {
      console.error('Error setting unread pending orders in localStorage:', error);
    }
  },
  
  // Clear unread pending orders count
  clearUnreadPendingOrders: (): void => {
    try {
      localStorage.setItem(UNREAD_PENDING_ORDERS_KEY, '0');
    } catch (error) {
      console.error('Error clearing unread pending orders from localStorage:', error);
    }
  },
  
  // Get unread processed orders count
  getUnreadProcessedOrders: (): number => {
    try {
      return Number(localStorage.getItem(UNREAD_PROCESSED_ORDERS_KEY) || '0');
    } catch (error) {
      console.error('Error getting unread processed orders from localStorage:', error);
      return 0;
    }
  },
  
  // Set unread processed orders count
  setUnreadProcessedOrders: (count: number): void => {
    try {
      localStorage.setItem(UNREAD_PROCESSED_ORDERS_KEY, String(Math.max(0, count)));
    } catch (error) {
      console.error('Error setting unread processed orders in localStorage:', error);
    }
  },
  
  // Clear unread processed orders count
  clearUnreadProcessedOrders: (): void => {
    try {
      localStorage.setItem(UNREAD_PROCESSED_ORDERS_KEY, '0');
    } catch (error) {
      console.error('Error clearing unread processed orders from localStorage:', error);
    }
  },
  
  // Get unread sent orders count
  getUnreadSentOrders: (): number => {
    try {
      return Number(localStorage.getItem(UNREAD_SENT_ORDERS_KEY) || '0');
    } catch (error) {
      console.error('Error getting unread sent orders from localStorage:', error);
      return 0;
    }
  },
  
  // Set unread sent orders count
  setUnreadSentOrders: (count: number): void => {
    try {
      localStorage.setItem(UNREAD_SENT_ORDERS_KEY, String(Math.max(0, count)));
    } catch (error) {
      console.error('Error setting unread sent orders in localStorage:', error);
    }
  },
  
  // Clear unread sent orders count
  clearUnreadSentOrders: (): void => {
    try {
      localStorage.setItem(UNREAD_SENT_ORDERS_KEY, '0');
    } catch (error) {
      console.error('Error clearing unread sent orders from localStorage:', error);
    }
  },
  
  // Initialize the tracking system with current counts
  initializeTracking: (
    pendingCount: number,
    processedCount: number,
    sentCount: number
  ): void => {
    try {
      console.log('Initializing order tracking with counts:', { 
        pendingCount, 
        processedCount, 
        sentCount 
      });
      
      // Always set the initial values to ensure proper synchronization
      localStorage.setItem(LAST_ORDER_COUNT_KEY, String(pendingCount));
      localStorage.setItem(LAST_PROCESSED_COUNT_KEY, String(processedCount));
      localStorage.setItem(LAST_SENT_COUNT_KEY, String(sentCount));
      
      // Always reset unread counts to zero during initialization
      // This ensures we start with 0 instead of potentially having stale values
      localStorage.setItem(UNREAD_PENDING_ORDERS_KEY, '0');
      localStorage.setItem(UNREAD_PROCESSED_ORDERS_KEY, '0');
      localStorage.setItem(UNREAD_SENT_ORDERS_KEY, '0');
      
      // Initialize active tab if it doesn't exist
      if (!localStorage.getItem(LAST_ACTIVE_TAB_KEY)) {
        localStorage.setItem(LAST_ACTIVE_TAB_KEY, 'orders'); // Default to orders tab
      }
      
      console.log('Order tracking initialized successfully');
    } catch (error) {
      console.error('Error initializing order tracking in localStorage:', error);
    }
  }
};
