import { useState, useEffect } from 'react';

interface OrderHaltStatus {
  ordersHalted: boolean;
  message: string;
  loading: boolean;
  error: string | null;
}

export function useOrderHaltStatus(): OrderHaltStatus {
  const [status, setStatus] = useState<OrderHaltStatus>({
    ordersHalted: false,
    message: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/orders/halt-status');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStatus({
              ordersHalted: data.ordersHalted,
              message: data.message,
              loading: false,
              error: null,
            });
          } else {
            setStatus(prev => ({
              ...prev,
              loading: false,
              error: 'Failed to fetch order status',
            }));
          }
        } else {
          setStatus(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to fetch order status',
          }));
        }
      } catch (error) {
        // Console statement removed for security
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: 'Error fetching order status',
        }));
      }
    };

    fetchStatus();
    
    // Refresh status every minute
    const interval = setInterval(fetchStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return status;
}

