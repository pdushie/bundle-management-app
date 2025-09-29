'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import PricingDisplay from '@/components/PricingDisplay';

export default function PricingPage() {
  const { data: session, status } = useSession({ required: true });

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2">Loading your pricing information...</p>
      </div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Pricing</h1>
      
      <div className="max-w-3xl">
        <PricingDisplay showDetails={true} showSampleCalculation={true} />
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">About Our Pricing</h2>
          <p className="mb-3">
            We offer customized pricing plans based on your specific needs. The pricing information 
            displayed above reflects your current plan.
          </p>
          <p className="mb-3">
            Use the calculator to estimate costs for different data sizes. All prices are in 
            Ghanaian Cedi (GHS).
          </p>
          <p>
            If you have any questions about your pricing or would like to discuss adjustments, 
            please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
