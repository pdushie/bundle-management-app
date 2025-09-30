import React, { useState, useEffect } from 'react';
import { getCurrentUserPricing, calculatePrice } from '@/lib/pricingClient';

interface PricingDisplayProps {
  showDetails?: boolean; // Whether to show detailed pricing info
  showSampleCalculation?: boolean; // Whether to show a sample calculation
  className?: string;
}

export default function PricingDisplay({
  showDetails = true,
  showSampleCalculation = true,
  className = ''
}: PricingDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<any>(null);
  const [sampleGB, setSampleGB] = useState<number>(1);
  
  useEffect(() => {
    async function loadPricing() {
      try {
        setLoading(true);
        const data = await getCurrentUserPricing();
        setPricingData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load pricing information');
        console.error('Error loading pricing:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadPricing();
  }, []);
  
  if (loading) {
    return <div className="text-center py-4">Loading pricing information...</div>;
  }
  
  if (error) {
    return <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
      Error: {error}
    </div>;
  }
  
  if (!pricingData || !pricingData.hasProfile) {
    return <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-3 rounded">
      No pricing profile is assigned to your account. Please contact an administrator.
    </div>;
  }
  
  const { profile } = pricingData;
  
  // Calculate sample price if requested
  const samplePrice = showSampleCalculation ? 
    calculatePrice(profile, sampleGB) : 
    null;
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Your Pricing Plan</h2>
      <div className="mb-4">
        <h3 className="font-medium text-gray-700">{profile.name}</h3>
        {profile.description && <p className="text-gray-600 mt-1">{profile.description}</p>}
      </div>
      
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium mb-2">Pricing Details</h4>
          
          {profile.isTiered ? (
            <div>
              <p className="mb-2 text-gray-700">Tiered pricing based on data size:</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Data (GB)</th>
                    <th className="px-4 py-2 text-right">Price (GHS)</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.tiers?.sort((a: any, b: any) => parseFloat(a.dataGB) - parseFloat(b.dataGB)).map((tier: any) => (
                    <tr key={tier.id} className="border-t border-gray-200">
                      <td className="px-4 py-2">{tier.dataGB}</td>
                      <td className="px-4 py-2 text-right">{tier.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <p className="mb-1">Base Price: GHS {profile.basePrice}</p>
              <p className="mb-1">Price per GB: GHS {profile.dataPricePerGB}</p>
              {profile.minimumCharge && profile.minimumCharge !== "0" && 
                <p className="mb-1">Minimum Charge: GHS {profile.minimumCharge}</p>
              }
            </div>
          )}
        </div>
      )}
      
      {showSampleCalculation && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium mb-2">Price Calculator</h4>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="sampleGB" className="mr-2">Data size (GB):</label>
              <input 
                id="sampleGB"
                type="number" 
                min="0.1" 
                step="0.1" 
                value={sampleGB} 
                onChange={(e) => setSampleGB(parseFloat(e.target.value) || 0)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
            <div className="flex items-center">
              <span className="mr-2">Estimated price:</span>
              <span className="font-medium">GHS {samplePrice !== null ? samplePrice : '0.00'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
