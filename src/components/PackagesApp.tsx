'use client';

import { useState, useEffect } from 'react';
import { Package, DollarSign, Users, ArrowRight } from 'lucide-react';

interface PricingTier {
  id: number;
  profileId: number;
  dataGB: string;
  price: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PricingProfile {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  isTiered: boolean;
  basePrice: string | null;
  tiers: PricingTier[];
}

interface UserPricingResponse {
  hasProfile: boolean;
  profile?: PricingProfile;
  message?: string;
  assignmentId?: number;
  assignedAt?: Date;
}

export default function PackagesApp() {
  const [pricingProfile, setPricingProfile] = useState<PricingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPricing();
  }, []);

  const fetchUserPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/current-user');
      const data: UserPricingResponse = await response.json();
      
      if (data.hasProfile && data.profile) {
        setPricingProfile(data.profile);
      } else {
        setError(data.message || 'No pricing profile assigned');
      }
    } catch (err) {
      console.error('Error fetching user pricing:', err);
      setError('Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Package className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">No Pricing Available</h2>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-red-500 mt-2">
            Please contact your administrator to assign a pricing profile to your account.
          </p>
        </div>
      </div>
    );
  }

  if (!pricingProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No Pricing Profile</h2>
          <p className="text-gray-600">No pricing profile has been assigned to your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Package className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Available Packages</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          View your assigned pricing profile and available data allocation options.
        </p>
      </div>

      {/* Pricing Profile Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">{pricingProfile.name}</h2>
            {pricingProfile.description && (
              <p className="text-blue-700 mb-4">{pricingProfile.description}</p>
            )}
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                pricingProfile.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {pricingProfile.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {pricingProfile.isTiered ? 'Tiered Pricing' : 'Flat Rate'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Your Profile</p>
              <p className="text-lg font-semibold text-gray-900">{pricingProfile.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Details */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Pricing Structure
        </h3>
        
        {pricingProfile.isTiered ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Available data allocations and their exact pricing:
            </p>
            {pricingProfile.tiers
              .sort((a, b) => parseFloat(a.dataGB) - parseFloat(b.dataGB))
              .map((tier, index) => (
                <div key={tier.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{parseFloat(tier.dataGB)} GB</h4>
                      <p className="text-sm text-gray-600">
                        Data allocation: {parseFloat(tier.dataGB)} GB
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-blue-600">
                        GHS {parseFloat(tier.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">per allocation</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-blue-900 mb-2">Flat Rate Pricing</h4>
              <p className="text-3xl font-bold text-blue-600">
                GHS {pricingProfile.basePrice ? parseFloat(pricingProfile.basePrice).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-blue-700 mt-1">per GB</p>
            </div>
          </div>
        )}
      </div>

      {/* Order Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          How to Place an Order
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium">Navigate to Send Order</p>
              <p>Use the "Send Order" tab to place your orders</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium">Exact Pricing Match</p>
              <p>Only order data allocations that match your pricing tiers exactly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      {pricingProfile.isTiered && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Important Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-800">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Exact Tier Matching</p>
                <p>You can only order the exact GB amounts shown above</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Pricing Validation</p>
                <p>Orders for unlisted allocations will be rejected</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}