"use client";

import { useEffect } from 'react';

interface UseBrowserTitleOptions {
  baseTitle?: string;
  orderCount?: number;
  processedOrderCount?: number;
  showCounts?: boolean;
}

export function useBrowserTitle({
  baseTitle = 'Clickyfied',
  orderCount = 0,
  processedOrderCount = 0,
  showCounts = true
}: UseBrowserTitleOptions) {
  
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    let title = baseTitle;
    
    if (showCounts) {
      const totalPendingCount = orderCount || 0;
      const totalProcessedCount = processedOrderCount || 0;
      
      // Only show counts if there are pending or processed orders
      if (totalPendingCount > 0 || totalProcessedCount > 0) {
        const parts: string[] = [];
        
        if (totalPendingCount > 0) {
          parts.push(`${totalPendingCount} pending`);
        }
        
        if (totalProcessedCount > 0) {
          parts.push(`${totalProcessedCount} processed`);
        }
        
        if (parts.length > 0) {
          title = `(${parts.join(', ')}) ${baseTitle}`;
        }
      }
    }
    
    document.title = title;
  }, [baseTitle, orderCount, processedOrderCount, showCounts]);
}