import React from 'react';
import { OrderProvider } from '@/lib/orderContext';
import App from './app';

export default function AppWithProviders() {
  return (
    <OrderProvider>
      <App />
    </OrderProvider>
  );
}
