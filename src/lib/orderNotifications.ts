"use client";

// Define custom events for order updates
export const ORDER_UPDATED_EVENT = 'order-updated';
export const ORDER_PROCESSED_EVENT = 'order-processed';
export const ORDER_SENT_EVENT = 'order-sent';
export const COUNT_UPDATED_EVENT = 'count-updated';

// Track the last time each notification was fired to prevent flooding
const lastNotificationTime: Record<string, number> = {
  [ORDER_UPDATED_EVENT]: 0,
  [ORDER_PROCESSED_EVENT]: 0,
  [ORDER_SENT_EVENT]: 0,
  [COUNT_UPDATED_EVENT]: 0
};

// Helper function to throttle notifications
const throttleNotification = (eventName: string, minInterval = 300): boolean => {
  const now = Date.now();
  const lastTime = lastNotificationTime[eventName] || 0;
  
  if (now - lastTime >= minInterval) {
    lastNotificationTime[eventName] = now;
    return true;
  }
  return false;
};

// Enhanced helper function to dispatch an order updated event
export const notifyOrderUpdated = (details?: object) => {
  if (typeof window !== 'undefined' && throttleNotification(ORDER_UPDATED_EVENT)) {
    console.log('Dispatching ORDER_UPDATED_EVENT');
    
    // Create a custom event with optional details
    const event = details 
      ? new CustomEvent(ORDER_UPDATED_EVENT, { detail: details }) 
      : new Event(ORDER_UPDATED_EVENT);
      
    window.dispatchEvent(event);
    
    // Also dispatch a generic count updated event
    notifyCountUpdated();
  }
};

// Helper function specifically for when an order is processed
export const notifyOrderProcessed = (orderId?: string) => {
  if (typeof window !== 'undefined' && throttleNotification(ORDER_PROCESSED_EVENT)) {
    console.log('Dispatching ORDER_PROCESSED_EVENT');
    
    // Create a custom event with the order ID
    const event = new CustomEvent(ORDER_PROCESSED_EVENT, { 
      detail: { orderId, timestamp: Date.now() } 
    });
    
    window.dispatchEvent(event);
    
    // Also dispatch a generic order updated event
    notifyOrderUpdated({ type: 'processed', orderId });
  }
};

// Helper function specifically for when a user sends an order
export const notifyOrderSent = (orderId?: string) => {
  if (typeof window !== 'undefined' && throttleNotification(ORDER_SENT_EVENT)) {
    console.log('Dispatching ORDER_SENT_EVENT');
    
    // Create a custom event with the order ID
    const event = new CustomEvent(ORDER_SENT_EVENT, { 
      detail: { orderId, timestamp: Date.now() } 
    });
    
    window.dispatchEvent(event);
    
    // Also dispatch a generic order updated event
    notifyOrderUpdated({ type: 'sent', orderId });
  }
};

// Helper function to specifically trigger count updates
export const notifyCountUpdated = () => {
  if (typeof window !== 'undefined' && throttleNotification(COUNT_UPDATED_EVENT)) {
    console.log('Dispatching COUNT_UPDATED_EVENT');
    
    // Create and dispatch a custom event when counts need to be updated
    const event = new Event(COUNT_UPDATED_EVENT);
    window.dispatchEvent(event);
  }
};
