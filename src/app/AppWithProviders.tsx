"use client";

import React from 'react';
import { OrderProvider } from '@/lib/orderContext';

// This component wraps the app content with the OrderProvider
export default function AppWithProviders({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <OrderProvider>
      {children}
    </OrderProvider>
  );
}
