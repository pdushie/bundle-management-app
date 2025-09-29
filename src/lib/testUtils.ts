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
      console.log(`Simulating ${orderCount} ${orderCount === 0 ? 'zero' : 'new'} orders`);
      notifyOrderUpdated({ type: 'new', count: orderCount });
    }
    
    if (processedCount !== undefined) {
      console.log(`Simulating ${processedCount} ${processedCount === 0 ? 'zero' : 'newly processed'} orders`);
      notifyOrderProcessed();
    }
    
    if (sentCount !== undefined) {
      console.log(`Simulating ${sentCount} ${sentCount === 0 ? 'zero' : 'newly sent'} orders`);
      notifyOrderSent();
    }
    
    // Always trigger a count update to refresh all badges
    notifyCountUpdated();
  }
  
  console.log('Simulated new orders - triggered notification events');
  return { success: true };
}

/**
 * Test utility to verify notification permissions and sound playback
 * without requiring actual order updates
 */
export function testNotificationSystem() {
  // Test browser notification permission
  if ('Notification' in window) {
    console.log(`Notification permission status: ${Notification.permission}`);
    
    if (Notification.permission === 'granted') {
      // Test notification
      const testNotification = new Notification('Bundle Management App - Test', {
        body: 'This is a test notification. If you see this, notifications are working!',
        icon: '/globe.svg'
      });
      
      setTimeout(() => testNotification.close(), 5000);
    } else {
      console.log('Notification permission not granted. Request permission first.');
    }
  } else {
    console.log('Notifications not supported in this browser');
  }
  
  // Test sound
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    audio.play()
      .then(() => console.log('Test notification sound played successfully'))
      .catch(err => console.error('Error playing test sound:', err));
  } catch (error) {
    console.error('Error testing notification sound:', error);
  }
  
  return { 
    notificationsSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    audioTested: true
  };
}
