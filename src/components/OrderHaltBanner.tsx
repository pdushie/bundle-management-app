"use client";

import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { useOrderHaltStatus } from '@/hooks/useOrderHaltStatus';

interface OrderHaltBannerProps {
  className?: string;
}

export default function OrderHaltBanner({ className = '' }: OrderHaltBannerProps) {
  const { ordersHalted, message, loading } = useOrderHaltStatus();

  // Don't show anything if not halted or still loading
  if (loading || !ordersHalted) {
    return null;
  }

  return (
    <div className={`bg-red-50 border-l-4 border-red-400 p-4 mb-6 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Lock className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-400 mr-2" />
            <p className="text-sm font-medium text-red-800">
              Order Processing Temporarily Halted
            </p>
          </div>
          <p className="mt-1 text-sm text-red-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function OrderHaltAlert({ className = '' }: OrderHaltBannerProps) {
  const { ordersHalted, message, loading } = useOrderHaltStatus();

  if (loading || !ordersHalted) {
    return null;
  }

  return (
    <div className={`bg-red-100 border border-red-300 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Orders Temporarily Halted</p>
          <p className="text-xs text-red-700 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}