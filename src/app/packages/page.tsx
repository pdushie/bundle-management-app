'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Zap, 
  Shield, 
  Calculator,
  ArrowRight,
  Info,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface PricingTier {
  id: number;
  profileId: number;
  dataGB: string;
  price: string;
}

interface PricingProfile {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  dataPricePerGB?: string;
  minimumCharge: string;
  isActive: boolean;
  isTiered: boolean;
  tiers?: PricingTier[];
}

interface UserPricingData {
  hasProfile: boolean;
  profile?: PricingProfile;
  assignmentId?: number;
  assignedAt?: string;
  message?: string;
}

export default function PackagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<UserPricingData | null>(null);
  const [calculatorGB, setCalculatorGB] = useState<number>(1);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has regular user role
    if (session.user?.role !== 'user') {
      router.push('/');
      return;
    }

    fetchPricingData();
  }, [session, status, router]);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/current-user');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pricing information');
      }
      
      const data = await response.json();
      setPricingData(data);
    } catch (err) {
      // console.error('Error fetching pricing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = (profile: PricingProfile, dataGB: number): string => {
    if (profile.isTiered && profile.tiers && profile.tiers.length > 0) {
      // Sort tiers by data amount
      const sortedTiers = [...profile.tiers].sort((a, b) => 
        parseFloat(a.dataGB) - parseFloat(b.dataGB)
      );
      
      // Find the appropriate tier
      let selectedTier = sortedTiers.find(tier => parseFloat(tier.dataGB) >= dataGB);
      
      // If no tier found (dataGB is larger than all tiers), use the highest tier
      if (!selectedTier) {
        selectedTier = sortedTiers[sortedTiers.length - 1];
      }
      
      return parseFloat(selectedTier.price).toFixed(2);
    } else {
      // Traditional pricing: base price + (data * price per GB)
      const basePriceNum = parseFloat(profile.basePrice || '0');
      const dataPriceNum = parseFloat(profile.dataPricePerGB || '0');
      const minimumChargeNum = parseFloat(profile.minimumCharge || '0');
      
      const calculatedPrice = basePriceNum + (dataGB * dataPriceNum);
      const finalPrice = Math.max(calculatedPrice, minimumChargeNum);
      
      return finalPrice.toFixed(2);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your packages...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'user') {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <Info className="h-8 w-8 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Packages</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={fetchPricingData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!pricingData?.hasProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 mb-4">
            <Package className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Package Assigned</h2>
          <p className="text-yellow-700 mb-4">
            You don't have a pricing package assigned to your account yet.
          </p>
          <p className="text-sm text-yellow-600">
            Please contact support to get a package assigned to your account.
          </p>
        </div>
      </div>
    );
  }

  const profile = pricingData.profile!;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
          <Package className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Data Packages</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore your available data packages and pricing options. Calculate costs for different data sizes and choose what works best for you.
        </p>
      </div>

      {/* Current Package */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Your Current Package</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
            {profile.description && (
              <p className="text-gray-600 mt-1">{profile.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Active
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Package Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Package Details</h3>
          </div>

          {profile.isTiered ? (
            <div>
              <p className="text-gray-600 mb-4">Your package uses tiered pricing based on data size:</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 rounded-lg">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data Size</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profile.tiers
                      ?.sort((a, b) => parseFloat(a.dataGB) - parseFloat(b.dataGB))
                      .map((tier, index) => (
                        <tr key={tier.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tier.dataGB} GB</span>
                              {index === 0 && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                  Minimum
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-lg font-semibold text-gray-900">
                              GHS {parseFloat(tier.price).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>How it works:</strong> You pay the price for the tier that matches or exceeds your data usage. 
                  If you need more than our highest tier, you'll pay the highest tier price.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Base Price:</span>
                <span className="font-semibold">GHS {parseFloat(profile.basePrice).toFixed(2)}</span>
              </div>
              {profile.dataPricePerGB && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Price per GB:</span>
                  <span className="font-semibold">GHS {parseFloat(profile.dataPricePerGB).toFixed(2)}</span>
                </div>
              )}
              {profile.minimumCharge && parseFloat(profile.minimumCharge) > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Minimum Charge:</span>
                  <span className="font-semibold">GHS {parseFloat(profile.minimumCharge).toFixed(2)}</span>
                </div>
              )}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>How it works:</strong> You pay the base price plus the per-GB rate for your data usage, 
                  with a minimum charge applied if applicable.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Price Calculator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Price Calculator</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="dataAmount" className="block text-sm font-medium text-gray-700 mb-2">
                How much data do you need? (GB)
              </label>
              <input
                id="dataAmount"
                type="number"
                min="0.1"
                step="0.1"
                value={calculatorGB}
                onChange={(e) => setCalculatorGB(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter data amount"
              />
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">Estimated Total Cost</p>
                  <p className="text-2xl font-bold text-green-800">
                    GHS {calculatePrice(profile, calculatorGB)}
                  </p>
                </div>
                <div className="text-green-600">
                  <Zap className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Quick Calculate</h4>
              <div className="grid grid-cols-3 gap-2">
                {[1, 5, 10].map((gb) => (
                  <button
                    key={gb}
                    onClick={() => setCalculatorGB(gb)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                  >
                    <div className="text-sm font-medium text-gray-900">{gb} GB</div>
                    <div className="text-xs text-gray-600">GHS {calculatePrice(profile, gb)}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Start Ordering Data
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <strong>Questions about pricing?</strong> Contact our support team for assistance with your package or to discuss custom pricing options.
            </p>
          </div>
          <div>
            <p className="mb-2">
              <strong>Want to change your package?</strong> Package changes are handled by administrators. Please reach out to discuss your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}