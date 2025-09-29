import React, { useState, useEffect } from 'react';
import { getCurrentUserPricing, calculatePrice } from '../lib/pricingClient';

// Import types from pricingClient
import type { UserPricingResponse, PricingProfile } from '../lib/pricingClient';

interface PricingSummaryProps {
  dataSizeGB?: number; // If provided, will show calculated price for this data size
  className?: string;
  onPriceCalculated?: (price: number | null) => void; // Callback for price calculation
}

export default function PricingSummary({
  dataSizeGB,
  className = '',
  onPriceCalculated
}: PricingSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [pricingData, setPricingData] = useState<UserPricingResponse | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  
  useEffect(() => {
    async function loadPricing() {
      try {
        setLoading(true);
        const data = await getCurrentUserPricing();
        setPricingData(data);
        
        // Calculate price if data size is provided
        if (data.hasProfile && data.profile && dataSizeGB !== undefined) {
          const price = calculatePrice(data.profile, dataSizeGB);
          setCalculatedPrice(price);
          if (onPriceCalculated) onPriceCalculated(price);
        }
      } catch (err) {
        console.error('Error loading pricing:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadPricing();
  }, [dataSizeGB, onPriceCalculated]);
  
  // When data size changes, recalculate price
  useEffect(() => {
    if (pricingData?.hasProfile && pricingData.profile && dataSizeGB !== undefined) {
      const price = calculatePrice(pricingData.profile, dataSizeGB);
      setCalculatedPrice(price);
      if (onPriceCalculated) onPriceCalculated(price);
    }
  }, [dataSizeGB, pricingData, onPriceCalculated]);
  
  if (loading) {
    return <div className={`text-sm text-gray-500 ${className}`}>Loading pricing...</div>;
  }
  
  if (!pricingData || !pricingData.hasProfile) {
    return <div className={`text-sm text-yellow-600 ${className}`}>
      No pricing plan assigned
    </div>;
  }
  
  const { profile } = pricingData;
  
  return (
    <div className={`text-sm ${className}`}>
      <div className="font-medium">{profile.name}</div>
      
      {calculatedPrice !== null && dataSizeGB !== undefined ? (
        <div className="mt-1">
          <span className="text-gray-600">Cost for {dataSizeGB} GB:</span> 
          <span className="font-medium ml-1">GHS {calculatedPrice}</span>
        </div>
      ) : (
        profile.isTiered ? (
          <div className="text-gray-600 mt-1">Tiered pricing based on data size</div>
        ) : (
          <div className="text-gray-600 mt-1">
            Base: GHS {profile.basePrice}, 
            Per GB: GHS {profile.dataPricePerGB || '0.00'}
          </div>
        )
      )}
      
      <div className="mt-1">
        <a href="/pricing" className="text-blue-600 hover:underline">View full pricing details</a>
      </div>
    </div>
  );
}
