"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  CreditCard,
  Tag,
  Check,
  X
} from 'lucide-react';

interface PricingProfile {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  dataPricePerGB: number;
  minimumCharge: number;
  isActive: boolean;
  isTiered: boolean;
}

interface ManageUserPricingProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export default function ManageUserPricing({ userId, userName, userEmail, onClose }: ManageUserPricingProps) {
  const [profiles, setProfiles] = useState<PricingProfile[]>([]);
  const [userProfiles, setUserProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPricingData();
  }, [userId]);

  const fetchPricingData = async () => {
    try {
      setIsLoading(true);
      // Fetch all available pricing profiles
      const profilesResponse = await fetch('/api/admin/pricing-profiles');
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        setProfiles(profilesData.profiles || []);
      }
      
      // Fetch user's assigned pricing profiles
      const userProfilesResponse = await fetch(`/api/admin/users/${userId}/pricing-profiles`);
      if (userProfilesResponse.ok) {
        const userProfilesData = await userProfilesResponse.json();
        
        // Extract profile IDs from the profiles array
        if (userProfilesData.profiles && userProfilesData.profiles.length > 0) {
          const profileIds = userProfilesData.profiles.map((profile: any) => profile.id.toString());
          setUserProfiles(profileIds);
          
          // If user has a profile assigned, select it by default
          if (profileIds.length > 0) {
            setSelectedProfile(profileIds[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignProfile = async () => {
    if (!selectedProfile) return;
    
    setActionLoading(true);
    try {
      // Use the simplified API endpoint for profile assignment
      const response = await fetch(`/api/admin/user-profile-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          profileId: selectedProfile
        })
      });
      
      if (response.ok) {
        // Update user profiles and refresh data
        setUserProfiles([selectedProfile]);
        fetchPricingData(); // Refresh the data to ensure we have the latest info
        // onClose(); // Don't close immediately so user can see the update
      }
    } catch (error) {
      console.error('Failed to assign pricing profile:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const removeProfile = async () => {
    if (userProfiles.length === 0) return;
    
    setActionLoading(true);
    try {
      // Use the simplified API endpoint for removing profile assignments
      const profileId = userProfiles[0]; // Assuming one profile per user
      await fetch(`/api/admin/user-profile-assignment?userId=${userId}&profileId=${profileId}`, {
        method: 'DELETE',
      });
      
      setUserProfiles([]);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Failed to remove pricing profiles:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Get current profile details with null safety
  const currentProfile = userProfiles.length > 0 
    ? profiles.find(p => p && p.id && userProfiles.includes(p.id.toString())) || null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-1">
        <Label className="text-lg font-bold">Manage Pricing for {userName}</Label>
        <p className="text-sm text-gray-700">{userEmail}</p>
      </div>
      
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading pricing profiles...</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Current Pricing Profile</h4>
                {currentProfile ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">{currentProfile.name}</span>
                    </div>
                    {currentProfile.description && (
                      <p className="text-sm text-gray-700 mt-1">{currentProfile.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="text-sm">
                        <p className="text-gray-700">Base Cost/GB:</p>
                        <p className="font-medium">${currentProfile.dataPricePerGB ? parseFloat(currentProfile.dataPricePerGB.toString()).toFixed(2) : '0.00'}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-700">Base Price:</p>
                        <p className="font-medium">${currentProfile.basePrice ? parseFloat(currentProfile.basePrice.toString()).toFixed(2) : '0.00'}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-700">Min Cost/Order:</p>
                        <p className="font-medium">${currentProfile.minimumCharge ? parseFloat(currentProfile.minimumCharge.toString()).toFixed(2) : '0.00'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center mt-2 text-amber-600 bg-amber-50 py-2 px-3 rounded-md">
                    <Tag className="w-4 h-4 mr-2" />
                    <span>No pricing profile assigned. Using default pricing.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Label htmlFor="pricing-profile" className="text-base font-semibold text-gray-800 mb-1 block">
              Assign Pricing Profile
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <Select
                value={selectedProfile || ''}
                onValueChange={setSelectedProfile}
              >
                <SelectTrigger 
                  id="pricing-profile" 
                  className="w-full pl-10 bg-white border-2 border-blue-200 hover:border-blue-400 focus:border-blue-500 h-12 shadow-sm hover:shadow text-base font-medium rounded-md transition-all duration-200"
                >
                  <SelectValue placeholder="Select a pricing profile" />
                </SelectTrigger>
                <SelectContent className="bg-white border-blue-200 shadow-lg">
                  {profiles.map(profile => (
                    <SelectItem 
                      key={profile.id} 
                      value={profile.id}
                      className="hover:bg-blue-50 py-2.5 cursor-pointer"
                    >
                      <div className="flex items-center">
                        <span className="font-medium">{profile.name}</span>
                        <span className="ml-2 text-gray-700 text-sm">
                          - ${profile.dataPricePerGB ? parseFloat(profile.dataPricePerGB.toString()).toFixed(2) : '0.00'}/GB, 
                          Base: ${profile.basePrice ? parseFloat(profile.basePrice.toString()).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-1 text-sm text-blue-600">
                Click to select a pricing profile for this user
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                onClick={removeProfile}
                disabled={actionLoading || userProfiles.length === 0}
              >
                <X className="w-4 h-4 mr-1" />
                Remove Profile
              </Button>
              
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
                
                <Button 
                  onClick={assignProfile}
                  disabled={actionLoading || !selectedProfile}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Assign Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
