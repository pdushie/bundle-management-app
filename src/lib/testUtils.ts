/**
 * Test utilities for simulating order notifications and updates
 * Used for testing notification badges, sounds and browser alerts
 */

import { 
  notifyOrderUpdated, 
  notifyOrderProcessed, 
  notifyOrderSent, 
  notifyCountUpdated 
} from './orderNotifications';

/**
 * Simulates new orders arriving by firing appropriate notification events
 * to test the notification system without requiring database changes
 */
export async function simulateNewOrders(options: {
  orderCount?: number;
  processedCount?: number;
  sentCount?: number;
  triggerEvent?: boolean;
} = {}) {
  const { orderCount, processedCount, sentCount, triggerEvent = true } = options;
  
  // Simulate the events that would be fired when orders are updated
  if (triggerEvent) {
    if (orderCount !== undefined) {
      // Console log removed for security
      notifyOrderUpdated({ type: 'new', count: orderCount });
    }
    
    if (processedCount !== undefined) {
      // Console log removed for security
      notifyOrderProcessed();
    }
    
    if (sentCount !== undefined) {
      // Console log removed for security
      notifyOrderSent();
    }
    
    // Always trigger a count update to refresh all badges
    notifyCountUpdated();
  }
  
  // Console log removed for security
  return { success: true };
}

/**
 * Test utility to verify notification permissions and sound playback
 * without requiring actual order updates
 */
export function testNotificationSystem() {
  // Test browser notification permission
  if ('Notification' in window) {
    // Console log removed for security
    
    if (Notification.permission === 'granted') {
      // Test notification
      const testNotification = new Notification('Bundle Management App - Test', {
        body: 'This is a test notification. If you see this, notifications are working!',
        icon: '/globe.svg'
      });
      
      setTimeout(() => testNotification.close(), 5000);
    } else {
      // Console log removed for security
    }
  } else {
    // Console log removed for security
  }
  
  // Test sound
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    audio.play()
      .then(() => {
        // Console log removed for security
      });
  } catch (error) {
    // Console statement removed for security
  }
  
  return { 
    notificationsSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    audioTested: true
  };
}


