/**
 * External Time Service
 * Provides accurate server time from external sources to avoid relying on client-side time
 */

// Cache for storing the time offset between server and client
let timeOffset: number = 0;
let lastSyncTime: number = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // Sync every 5 minutes

// World Time API as primary source, with server fallback
const TIME_API_ENDPOINTS = [
  'https://worldtimeapi.org/api/timezone/Etc/UTC',
  'https://api.timezonedb.com/v2.1/get-zone?key=demo&format=json&by=zone&zone=UTC',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
  // Fallback to our own server time API
  '/api/time'
];

interface WorldTimeResponse {
  datetime?: string;
  unixtime?: number;
  utc_datetime?: string;
}

interface TimezoneDBResponse {
  timestamp?: number;
  formatted?: string;
}

interface TimeAPIResponse {
  dateTime?: string;
  timeStamp?: number;
}

/**
 * Fetch current UTC time from external API
 */
async function fetchExternalTime(): Promise<Date> {
  for (const endpoint of TIME_API_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different API response formats
      if (endpoint.includes('worldtimeapi.org')) {
        const worldTimeData = data as WorldTimeResponse;
        if (worldTimeData.datetime) {
          return new Date(worldTimeData.datetime);
        }
        if (worldTimeData.unixtime) {
          return new Date(worldTimeData.unixtime * 1000);
        }
      } else if (endpoint.includes('timezonedb.com')) {
        const timezoneData = data as TimezoneDBResponse;
        if (timezoneData.timestamp) {
          return new Date(timezoneData.timestamp * 1000);
        }
        if (timezoneData.formatted) {
          return new Date(timezoneData.formatted);
        }
      } else if (endpoint.includes('timeapi.io')) {
        const timeApiData = data as TimeAPIResponse;
        if (timeApiData.dateTime) {
          return new Date(timeApiData.dateTime);
        }
        if (timeApiData.timeStamp) {
          return new Date(timeApiData.timeStamp);
        }
      } else if (endpoint === '/api/time') {
        // Our own server time API
        if (data.timestamp) {
          return new Date(data.timestamp);
        }
        if (data.datetime) {
          return new Date(data.datetime);
        }
      }
      
      // Generic fallback - look for common timestamp fields
      if (data.timestamp) {
        return new Date(data.timestamp * 1000);
      }
      if (data.datetime || data.dateTime) {
        return new Date(data.datetime || data.dateTime);
      }
      
    } catch (error) {
      console.warn(`Failed to fetch time from ${endpoint}:`, error);
      continue;
    }
  }
  
  throw new Error('All time service endpoints failed');
}

/**
 * Sync with external time service and calculate offset
 */
async function syncTime(): Promise<void> {
  try {
    const startTime = Date.now();
    const externalTime = await fetchExternalTime();
    const endTime = Date.now();
    
    // Account for network latency by taking the average
    const networkDelay = (endTime - startTime) / 2;
    const serverTime = externalTime.getTime() + networkDelay;
    
    timeOffset = serverTime - Date.now();
    lastSyncTime = Date.now();
    
    console.log(`Time synced successfully. Offset: ${timeOffset}ms`);
  } catch (error) {
    console.error('Failed to sync time:', error);
    // Don't throw - allow system to work with local time as fallback
  }
}

/**
 * Get current accurate time (server time + offset)
 */
export async function getCurrentTime(): Promise<Date> {
  // Check if we need to sync or re-sync
  const now = Date.now();
  if (lastSyncTime === 0 || (now - lastSyncTime) > SYNC_INTERVAL) {
    await syncTime();
  }
  
  // Return adjusted time
  return new Date(now + timeOffset);
}

/**
 * Get current accurate time synchronously (uses cached offset)
 */
export function getCurrentTimeSync(): Date {
  // If we haven't synced yet, try to sync in background
  if (lastSyncTime === 0) {
    syncTime().catch(console.error);
  }
  
  return new Date(Date.now() + timeOffset);
}

/**
 * Format date as YYYY-MM-DD using accurate time
 */
export async function getCurrentDateString(): Promise<string> {
  const date = await getCurrentTime();
  return formatDateString(date);
}

/**
 * Format date as YYYY-MM-DD synchronously
 */
export function getCurrentDateStringSync(): string {
  const date = getCurrentTimeSync();
  return formatDateString(date);
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time as HH:MM:SS using accurate time
 */
export async function getCurrentTimeString(): Promise<string> {
  const date = await getCurrentTime();
  return formatTimeString(date);
}

/**
 * Format time as HH:MM:SS synchronously
 */
export function getCurrentTimeStringSync(): string {
  const date = getCurrentTimeSync();
  return formatTimeString(date);
}

/**
 * Format a date as HH:MM:SS
 */
export function formatTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get timestamp using accurate time
 */
export async function getCurrentTimestamp(): Promise<number> {
  const date = await getCurrentTime();
  return date.getTime();
}

/**
 * Get timestamp synchronously
 */
export function getCurrentTimestampSync(): number {
  return getCurrentTimeSync().getTime();
}

/**
 * Initialize time service (call this when the app starts)
 */
export async function initializeTimeService(): Promise<void> {
  await syncTime();
}

/**
 * Force a time sync
 */
export async function forceTimeSync(): Promise<void> {
  await syncTime();
}

/**
 * Get time sync status
 */
export function getTimeSyncStatus(): {
  lastSyncTime: number;
  timeOffset: number;
  isStale: boolean;
} {
  const now = Date.now();
  return {
    lastSyncTime,
    timeOffset,
    isStale: lastSyncTime === 0 || (now - lastSyncTime) > SYNC_INTERVAL
  };
}
