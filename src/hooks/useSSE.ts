import { useEffect, useRef, useState } from 'react';

interface SSEData {
  type: string;
  [key: string]: any;
}

interface UseSSEOptions {
  onMessage?: (data: SSEData) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  fallbackInterval?: number; // Fallback polling interval in ms
  fallbackCallback?: () => void; // Callback for fallback polling

}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    // Clean up existing connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }

    // Don't create EventSource if URL is empty
    if (!url) {
      setConnectionStatus('closed');
      return;
    }

    // Create new EventSource with credentials to ensure cookies are sent
    const eventSource = new EventSource(url, {
      withCredentials: true
    });
    eventSourceRef.current = eventSource;

    // Set up connection timeout
    const connectionTimeout = setTimeout(() => {
      if (eventSource.readyState === EventSource.CONNECTING) {
        console.warn(`SSE connection timeout for ${url} - closing and falling back`);
        eventSource.close();
        setConnectionStatus('error');
        
        // Set up fallback if configured
        if (options.fallbackInterval && options.fallbackCallback) {
          console.log(`Setting up fallback polling due to timeout for ${url}`);
          fallbackIntervalRef.current = setInterval(
            options.fallbackCallback,
            options.fallbackInterval
          );
        }
      }
    }, 10000); // 10 second timeout

    eventSource.onopen = () => {
      console.log(`SSE connection opened: ${url}`);
      clearTimeout(connectionTimeout);
      setConnectionStatus('connected');
      options.onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        options.onMessage?.(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      const readyState = eventSource.readyState;
      const isConnecting = readyState === EventSource.CONNECTING;
      const isClosed = readyState === EventSource.CLOSED;
      
      // Only log errors for actual failures, not connection attempts
      if (!isConnecting) {
        console.error(`SSE connection error for ${url}:`, {
          error,
          readyState,
          readyStateText: readyState === 0 ? 'CONNECTING' : 
                         readyState === 1 ? 'OPEN' : 
                         readyState === 2 ? 'CLOSED' : 'UNKNOWN',
          url: eventSource.url,
          timestamp: new Date().toISOString()
        });
      } else {
        // Just a debug log for connection attempts
        console.debug(`SSE connection attempt for ${url} (this is normal)`);
      }
      
      // Only set error state for actual failures, not connection attempts
      if (isClosed) {
        setConnectionStatus('error');
        
        // Set up fallback polling if configured
        if (options.fallbackInterval && options.fallbackCallback) {
          console.log(`Setting up fallback polling every ${options.fallbackInterval}ms for ${url}`);
          fallbackIntervalRef.current = setInterval(
            options.fallbackCallback,
            options.fallbackInterval
          );
        }
      }
      
      // Only call onError for actual failures
      if (!isConnecting) {
        options.onError?.(error);
      }
    };

    // Cleanup function
    return () => {
      clearTimeout(connectionTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

      setConnectionStatus('closed');
    };
  }, [url, options]);

  const close = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    setConnectionStatus('closed');
  };

  return {
    connectionStatus,
    close
  };
}