// Client-side wrapper for order operations
import { notifyOrderUpdated } from './orderNotifications';

// Define Order type to match the one in orderDbOperations.ts
type OrderEntryStatus = "pending" | "sent" | "error";

export type Order = {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  status: "pending" | "processed";
  entries: Array<{
    id?: number;
    number: string;
    allocationGB: number;
    status?: OrderEntryStatus;
    cost?: number | null; // Individual cost for this entry
  }>;
  pricingProfileId?: number; // ID of the pricing profile used
  pricingProfileName?: string; // Name of the pricing profile used
  cost?: number; // Total cost of the order
  estimatedCost?: number | null; // Total estimated cost of the order
  isSelected?: boolean;
  userId?: number;
};

// Utility function to perform API requests with retry logic
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= maxRetries) {
    try {
      // Add cache control and priority headers to improve reliability
      const enhancedOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          'Priority': 'high'
        },
      };
      
      const response = await fetch(url, enhancedOptions);
      if (response.ok) {
        return response;
      }
      
      // Handle specific HTTP errors
      if (response.status === 503) {
        // Service unavailable - worth retrying
        lastError = new Error(`Service unavailable (HTTP ${response.status})`);
      } else if (response.status === 429) {
        // Rate limit - wait longer before retrying
        lastError = new Error(`Rate limited (HTTP ${response.status})`);
        // Wait longer for rate limit errors
        await new Promise(resolve => setTimeout(resolve, (retries + 1) * 1000));
        retries++;
        continue;
      } else {
        // Other HTTP errors might not be worth retrying
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`API request failed (attempt ${retries + 1}/${maxRetries + 1}):`, lastError.message);
    }
    
    // Only do exponential backoff if we're going to retry
    if (retries < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retries), 5000); // Max 5 second delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    retries++;
  }
  
  throw lastError || new Error('API request failed after multiple retries');
};

// Save orders to database via API
export const saveOrders = async (orders: Order[]): Promise<void> => {
  try {
    const response = await fetchWithRetry('/api/orders/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orders }),
    });

    if (!response.ok) {
      throw new Error('Failed to save orders');
    }

    // Notify that orders have been updated
    notifyOrderUpdated();
  } catch (error) {
    console.error('Failed to save orders:', error);
    throw error;
  }
};

// Load orders from database via API
export const loadOrders = async (): Promise<Order[]> => {
  try {
    const response = await fetchWithRetry('/api/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load orders');
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to load orders:', error);
    return [];
  }
};

// Add a new order to the database via API
export const addOrder = async (order: Order): Promise<void> => {
  try {
    const response = await fetchWithRetry('/api/orders/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order }),
    });

    if (!response.ok) {
      throw new Error('Failed to add order');
    }

    // Notify that orders have been updated
    notifyOrderUpdated();
  } catch (error) {
    console.error('Failed to add order:', error);
    throw error;
  }
};

// Get orders sorted by timestamp with oldest first (for queue display)
export const getOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    const response = await fetchWithRetry('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'all-oldest-first' }),
    });

    if (!response.ok) {
      throw new Error('Failed to get orders');
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to get orders:', error);
    return [];
  }
};

// Get pending orders (not yet processed) sorted by timestamp with oldest first
export const getPendingOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    const response = await fetchWithRetry('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'pending' }),
    });

    if (!response.ok) {
      throw new Error('Failed to get pending orders');
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to get pending orders:', error);
    return [];
  }
};

// Get processed orders sorted by timestamp with oldest first
export const getProcessedOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    const response = await fetchWithRetry('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'processed' }),
    });

    if (!response.ok) {
      throw new Error('Failed to get processed orders');
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to get processed orders:', error);
    return [];
  }
};

// Get user's orders sorted by timestamp with oldest first
export const getUserOrdersOldestFirst = async (userEmail: string): Promise<Order[]> => {
  try {
    if (!userEmail) return [];

    const response = await fetchWithRetry('/api/orders/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail }),
    });

    if (!response.ok) {
      throw new Error('Failed to get user orders');
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to get user orders:', error);
    return [];
  }
};

// Update an existing order
export const updateOrder = async (order: Order): Promise<void> => {
  try {
    const response = await fetchWithRetry('/api/orders/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order }),
    });

    if (!response.ok) {
      throw new Error('Failed to update order');
    }
    
    // Notify that orders have been updated
    notifyOrderUpdated();
  } catch (error) {
    console.error('Failed to update order:', error);
    throw error;
  }
};

// Clear all orders
export const clearOrders = async (): Promise<void> => {
  try {
    const response = await fetchWithRetry('/api/orders/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to clear orders');
    }
    
    // Notify that orders have been updated
    notifyOrderUpdated();
  } catch (error) {
    console.error('Failed to clear orders:', error);
    throw error;
  }
};

// Update entry statuses for an order
export const updateEntryStatuses = async (orderId: string, status: OrderEntryStatus): Promise<void> => {
  try {
    const response = await fetchWithRetry('/api/orders/update-entry-statuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId, status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update entry statuses');
    }

    console.log(`Updated entry statuses for order ${orderId} to ${status}`);
  } catch (error) {
    console.error('Failed to update entry statuses:', error);
    throw error;
  }
};

// Get order counts with retry logic
export const getOrderCounts = async (userEmail?: string): Promise<{
  pendingCount: number;
  processedCount: number;
  userOrderCount: number;
}> => {
  const defaultCounts = {
    pendingCount: 0,
    processedCount: 0,
    userOrderCount: 0,
  };
  
  try {
    // Prepare the request body, ensuring it's never empty JSON
    const requestBody = userEmail ? JSON.stringify({ userEmail }) : JSON.stringify({ });
    
    console.log('Fetching order counts for user:', userEmail || 'anonymous');
    
    // Use our fetchWithRetry utility
    const response = await fetchWithRetry(
      '/api/orders/counts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      },
      3 // Maximum 3 retries
    );

    const data = await response.json();
    
    // Check if the response contains an error flag from our enhanced API
    if (data.connectionError) {
      console.warn('Database connection error reported by API');
      return defaultCounts;
    }
    
    // Ensure all count values are valid numbers
    const sanitizedData = {
      pendingCount: typeof data.pendingCount === 'number' ? data.pendingCount : 0,
      processedCount: typeof data.processedCount === 'number' ? data.processedCount : 0,
      userOrderCount: typeof data.userOrderCount === 'number' ? data.userOrderCount : 0,
    };
    
    console.log('Received order counts from API:', sanitizedData);
    
    return sanitizedData;
  } catch (error) {
    console.error('Failed to get order counts after retries:', error);
    
    // Handle different types of errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Network error when getting order counts - possibly offline');
    }
    
    return defaultCounts;
  }
};
