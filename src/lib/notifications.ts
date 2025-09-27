"use client";

// Helper functions for browser notifications
let notificationPermission: NotificationPermission | null = null;
const LAST_NOTIFIED_KEY = 'last_notified_timestamp';

// Request notification permission 
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }
  
  if (notificationPermission === null) {
    notificationPermission = Notification.permission;
  }
  
  // If we already have permission, no need to ask again
  if (notificationPermission === "granted") {
    return true;
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Check if we have permission to send notifications
export const hasNotificationPermission = (): boolean => {
  if (!("Notification" in window)) {
    return false;
  }
  
  if (notificationPermission === null) {
    notificationPermission = Notification.permission;
  }
  
  return notificationPermission === "granted";
};

// Send a browser notification
export const sendNotification = (
  title: string, 
  options: NotificationOptions = {}
): boolean => {
  // Don't proceed if notifications are not supported
  if (!("Notification" in window)) {
    return false;
  }
  
  // Check if we have permission
  if (Notification.permission !== "granted") {
    return false;
  }
  
  // Apply default options
  const defaultOptions: NotificationOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    // Note: TypeScript definitions might be outdated - vibrate is a valid option
    // @ts-ignore - Ignoring type error for vibrate property
    vibrate: [200, 100, 200],
    silent: false,
    ...options
  };
  
  // Create and display the notification
  try {
    new Notification(title, defaultOptions);
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};

// Play a notification sound
export const playNotificationSound = async (volume = 0.5): Promise<boolean> => {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = Math.max(0, Math.min(1, volume)); // Ensure volume is between 0 and 1
    await audio.play();
    return true;
  } catch (error) {
    console.error("Error playing notification sound:", error);
    return false;
  }
};

// Check if we should throttle notifications (to avoid notification spam)
export const shouldThrottleNotification = (minInterval = 30000): boolean => {
  try {
    const lastNotified = Number(localStorage.getItem(LAST_NOTIFIED_KEY) || '0');
    const now = Date.now();
    
    if (now - lastNotified >= minInterval) {
      localStorage.setItem(LAST_NOTIFIED_KEY, now.toString());
      return false; // Don't throttle
    }
    
    return true; // Should throttle
  } catch (error) {
    // If we can't access localStorage, default to not throttling
    return false;
  }
};

// Send a notification with throttling
export const sendThrottledNotification = (
  title: string,
  options: NotificationOptions = {},
  minInterval = 30000
): boolean => {
  if (shouldThrottleNotification(minInterval)) {
    console.log("Notification throttled");
    return false;
  }
  
  return sendNotification(title, options);
};
