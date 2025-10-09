"use client";

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/components/ui/toast';
import { 
  CirclePlus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Users,
  RefreshCcw
} from 'lucide-react';

interface PricingTier {
  id?: number;
  profileId?: number;
  dataGB: string;
  price: string;
}

interface PricingProfile {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  dataPricePerGB: string | null;
  minimumCharge: string;
  isActive: boolean;
  isTiered: boolean;
  tiers?: PricingTier[];
  createdAt?: string;
  updatedAt?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function PricingProfiles() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<PricingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<PricingProfile | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [dataPricePerGB, setDataPricePerGB] = useState('');
  const [minimumCharge, setMinimumCharge] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isTiered, setIsTiered] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([{ dataGB: '1', price: '10.00' }]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [profileUsers, setProfileUsers] = useState<User[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing-profiles');
      
      if (!res.ok) {
        throw new Error('Failed to fetch pricing profiles');
      }
      
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Error fetching pricing profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pricing profiles. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileDetails = async (profileId: number) => {
    try {
      const res = await fetch(`/api/admin/pricing-profiles/${profileId}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch profile details');
      }
      
      const data = await res.json();
      setCurrentProfile(data.profile);
      setProfileUsers(data.assignedUsers || []);
      
      return data;
    } catch (error) {
      console.error(`Error fetching profile ${profileId} details:`, error);
      toast({
        title: 'Error',
        description: 'Failed to load profile details. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentProfile(null);
    setName('');
    setDescription('');
    setBasePrice('0.00');  // Set to zero as we're not using it
    setDataPricePerGB('0.00');
    setMinimumCharge('0.00');  // Set to zero as we're not using it
    setIsActive(true);
    setIsTiered(true);  // Always use tiered pricing
    setPricingTiers([{ dataGB: '1', price: '10.00' }]);
    setExcelFile(null);
    setImportError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = async (profile: PricingProfile) => {
    setIsEditing(true);
    const data = await fetchProfileDetails(profile.id);
    
    if (data && data.profile) {
      setName(data.profile.name);
      setDescription(data.profile.description || '');
      setBasePrice(data.profile.basePrice);
      setDataPricePerGB(data.profile.dataPricePerGB || '');
      setMinimumCharge(data.profile.minimumCharge);
      setIsActive(data.profile.isActive);
      setIsTiered(data.profile.isTiered);
      setPricingTiers(data.profile.tiers?.length ? data.profile.tiers : [{ dataGB: '1', price: '10.00' }]);
      setExcelFile(null);
      setImportError('');
      setDialogOpen(true);
    }
  };

  const handleOpenUsers = async (profile: PricingProfile) => {
    const data = await fetchProfileDetails(profile.id);
    
    if (data) {
      setCurrentProfile(data.profile);
      await fetchAllUsers();
      setUserDialogOpen(true);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Profile name is required',
        variant: 'destructive'
      });
      return false;
    }
    
    // Since we're only using tiered pricing, we don't need to validate formula-based pricing fields
    // We'll set default values for basePrice and minimumCharge
    
    // Validate tiers if tiered pricing is enabled
    if (isTiered) {
      if (pricingTiers.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'At least one pricing tier is required',
          variant: 'destructive'
        });
        return false;
      }
      
      for (let i = 0; i < pricingTiers.length; i++) {
        const tier = pricingTiers[i];
        const parsedDataGB = parseFloat(tier.dataGB);
        const parsedPrice = parseFloat(tier.price);
        
        if (isNaN(parsedDataGB) || parsedDataGB <= 0) {
          toast({
            title: 'Validation Error',
            description: `Data GB must be a positive number in tier ${i + 1}`,
            variant: 'destructive'
          });
          return false;
        }
        
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          toast({
            title: 'Validation Error',
            description: `Price must be a positive number in tier ${i + 1}`,
            variant: 'destructive'
          });
          return false;
        }
      }
      
      // Check for duplicate data allocations
      const dataGBValues = pricingTiers.map(tier => parseFloat(tier.dataGB));
      const uniqueDataGBValues = new Set(dataGBValues);
      if (dataGBValues.length !== uniqueDataGBValues.size) {
        toast({
          title: 'Validation Error',
          description: 'Duplicate data GB allocations found. Each tier must have a unique data allocation.',
          variant: 'destructive'
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const profileData = {
        name,
        description: description.trim() || null,
        basePrice: 0, // Always set to 0 since we're not using it
        dataPricePerGB: null, // Always null since we only use tiered pricing
        minimumCharge: 0, // Always set to 0 since we're not using it
        isActive,
        isTiered: true, // Always use tiered pricing
        tiers: pricingTiers.map(tier => ({
          dataGB: tier.dataGB,
          price: tier.price
        }))
      };
      let res;
      if (isEditing && currentProfile) {
        res = await fetch(`/api/admin/pricing-profiles/${currentProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
      } else {
        res = await fetch('/api/admin/pricing-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save pricing profile');
      }
      setDialogOpen(false);
      fetchProfiles();
      toast({
        title: 'Success',
        description: isEditing 
          ? 'Pricing profile updated successfully' 
          : 'Pricing profile created successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error saving pricing profile:', error);
      toast({
        title: 'Error',
        description: `Failed to save pricing profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteProfile = async (profileId: number) => {
    if (!confirm('Are you sure you want to delete this pricing profile? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/pricing-profiles/${profileId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        
        if (errorData.assignedUsersCount) {
          toast({
            title: 'Cannot Delete',
            description: `This profile is assigned to ${errorData.assignedUsersCount} users. Please reassign them first.`,
            variant: 'destructive'
          });
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete pricing profile');
      }
      
      fetchProfiles();
      
      toast({
        title: 'Success',
        description: 'Pricing profile deleted successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting pricing profile:', error);
      toast({
        title: 'Error',
        description: `Failed to delete pricing profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  const assignUserToProfile = async (userId: number) => {
    if (!currentProfile) return;
    
    try {
      const res = await fetch(`/api/admin/pricing-profiles/${currentProfile.id}/users/${userId}`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to assign user to pricing profile');
      }
      
      fetchProfileDetails(currentProfile.id);
      
      toast({
        title: 'Success',
        description: 'User assigned to pricing profile successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error assigning user to pricing profile:', error);
      toast({
        title: 'Error',
        description: `Failed to assign user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  const removeUserFromProfile = async (userId: number) => {
    if (!currentProfile) return;
    
    try {
      const res = await fetch(`/api/admin/pricing-profiles/${currentProfile.id}/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove user from pricing profile');
      }
      
      fetchProfileDetails(currentProfile.id);
      
      toast({
        title: 'Success',
        description: 'User removed from pricing profile successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error removing user from pricing profile:', error);
      toast({
        title: 'Error',
        description: `Failed to remove user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  };

  // Helper function to check if a user is assigned to the current profile
  const isUserAssigned = (userId: number) => {
    return profileUsers.some(user => user.id === userId);
  };

  // Helper function to add pricing tier
  const addPricingTier = () => {
    setPricingTiers([...pricingTiers, { dataGB: '', price: '' }]);
  };
  
  // Helper function to remove pricing tier
  const removePricingTier = (index: number) => {
    if (pricingTiers.length > 1) {
      const newTiers = [...pricingTiers];
      newTiers.splice(index, 1);
      setPricingTiers(newTiers);
    }
  };
  
  // Helper function to update a pricing tier
  const updatePricingTier = (index: number, field: 'dataGB' | 'price', value: string) => {
    const newTiers = [...pricingTiers];
    newTiers[index][field] = value;
    setPricingTiers(newTiers);
  };

  // Handle Excel file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    if (!e.target.files || e.target.files.length === 0) {
      setExcelFile(null);
      return;
    }
    const file = e.target.files[0];
    setExcelFile(file);
  };
  
  // Process the Excel file
  const handleProcessExcel = async () => {
    if (!excelFile) {
      setImportError('No file selected');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('excelFile', excelFile);
      
      const res = await fetch('/api/admin/pricing-profiles/import', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to import pricing data');
      }
      
      const data = await res.json();
      if (data.tiers && Array.isArray(data.tiers)) {
        setPricingTiers(data.tiers.map((tier: any) => ({
          dataGB: tier.dataGB, // Keep exact string representation from Excel
          price: tier.price     // Keep exact string representation from Excel
        })));
        toast({
          title: 'Success',
          description: `Imported ${data.tiers.length} pricing tiers from Excel`,
        });
      } else {
        throw new Error('Invalid data format in Excel file');
      }
      setExcelFile(null);
    } catch (error) {
      console.error('Error importing Excel file:', error);
      setImportError(error instanceof Error ? error.message : 'Unknown error processing Excel file');
    }
  };

  // Calculate cost for sample data - only using tier prices
  const calculateSampleCost = (profile: PricingProfile, dataGB: number) => {
    // We only use tiered pricing now
    if (profile.tiers && profile.tiers.length > 0) {
      // Find the closest tier for the data amount
      const tiers = [...profile.tiers].sort((a, b) => 
        parseFloat(a.dataGB) - parseFloat(b.dataGB)
      );
      
      // Find the exact match or the next higher tier
      let selectedTier = tiers.find(tier => parseFloat(tier.dataGB) >= dataGB);
      
      // If no tier is found (meaning all tiers are smaller), use the highest tier
      if (!selectedTier) {
        selectedTier = tiers[tiers.length - 1];
      }
      
      // Just use the tier price directly - no basePrice or minimumCharge
      return parseFloat(selectedTier.price).toFixed(2);
    } else {
      // If no tiers (shouldn't happen), return 0
      return '0.00';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing Profiles</h1>
          <p className="text-muted-foreground">
            Manage pricing profiles for users and calculate order costs.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
          <CirclePlus className="mr-2 h-4 w-4" />
          Add Profile
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map(profile => (
          <Card key={profile.id} className={`${!profile.isActive ? 'bg-gray-50 border-dashed' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">
                  {profile.name}
                  {!profile.isActive && (
                    <span className="ml-2 text-xs sm:text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </CardTitle>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenUsers(profile)}>
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(profile)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-500"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {profile.description && (
                <CardDescription className="line-clamp-2">
                  {profile.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pricing Type:</span>
                  <span className="font-medium">Tiered</span>
                </div>
                {profile.tiers && profile.tiers.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pricing Tiers:</span>
                    <span className="font-medium">{profile.tiers.length} tiers</span>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <div className="text-sm font-medium">Sample Calculations:</div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">1GB Order:</span>
                    <span className="font-medium">GHS {calculateSampleCost(profile, 1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">5GB Order:</span>
                    <span className="font-medium">GHS {calculateSampleCost(profile, 5)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">10GB Order:</span>
                    <span className="font-medium">GHS {calculateSampleCost(profile, 10)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {loading && (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          </div>
        )}
        
        {!loading && profiles.length === 0 && (
          <Card className="col-span-full bg-gray-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold">No Pricing Profiles</h3>
              <p className="text-sm text-gray-700 text-center max-w-md mt-1 mb-4">
                Create your first pricing profile to assign to users and calculate order costs.
              </p>
              <Button onClick={handleOpenCreate}>
                <CirclePlus className="mr-2 h-4 w-4" />
                Add Your First Profile
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Create/Edit Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{isEditing ? 'Edit Pricing Profile' : 'Create Pricing Profile'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-6 items-center gap-4">
              <Label htmlFor="name" className="text-right col-span-1 text-gray-900">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-5 bg-white text-gray-900 border-gray-300"
                placeholder="Standard, Premium, etc."
              />
            </div>
            <div className="grid grid-cols-6 items-center gap-4">
              <Label htmlFor="description" className="text-right col-span-1 text-gray-900">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-5 bg-white text-gray-900 border-gray-300"
                placeholder="Optional description of this pricing profile"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-6 items-center gap-4">
              <Label htmlFor="pricingType" className="text-right col-span-1 text-gray-900">
                Pricing Type
              </Label>
              <div className="flex items-center space-x-2 col-span-5">
                <span className="text-sm font-medium text-gray-900">Tiered pricing</span>
              </div>
            </div>
            
            {isTiered && (
              <div className="grid grid-cols-12 gap-4">
                <div className="text-right pt-2 col-span-2">
                  <Label className="text-gray-900">
                    Pricing Tiers <span className="text-red-500">*</span>
                  </Label>
                </div>
                <div className="col-span-10 space-y-3">
                  <div className="grid grid-cols-10 gap-4 mb-1">
                    <div className="text-sm font-medium text-center col-span-4 text-gray-900">Data (GB)</div>
                    <div className="text-sm font-medium text-center col-span-5 text-gray-900">Price (GHS)</div>
                    <div className="text-sm font-medium text-center col-span-1"></div>
                  </div>
                  
                  <div className={`${pricingTiers.length > 5 ? 'max-h-72 overflow-y-auto pr-1 border border-gray-200 rounded-md p-3' : ''}`}>
                    {pricingTiers.length > 5 && (
                      <p className="text-xs sm:text-sm text-blue-600 mb-2 text-center">Scroll to see all tiers</p>
                    )}
                    {pricingTiers.map((tier, index) => (
                      <div key={index} className="grid grid-cols-10 gap-4 items-center mb-3">
                        <div className="relative col-span-4">
                          <Input
                            value={tier.dataGB}
                            onChange={(e) => updatePricingTier(index, 'dataGB', e.target.value)}
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1"
                            className="bg-white text-gray-900 border-gray-300"
                          />
                        </div>
                        <div className="relative col-span-5">
                          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700 flex items-center justify-center text-xs sm:text-sm font-medium">
                            GHS
                          </div>
                          <Input
                            value={tier.price}
                            onChange={(e) => updatePricingTier(index, 'price', e.target.value)}
                            className="pl-10 bg-white text-gray-900 border-gray-300"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="10.00"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {pricingTiers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="p-1 h-8 w-8 text-red-500 hover:bg-red-50"
                              onClick={() => removePricingTier(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPricingTier}
                    className="w-full mt-3 bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                  >
                    <CirclePlus className="h-4 w-4 mr-2" /> Add Tier
                  </Button>
                  
                  <div className="mt-6 border-t pt-4">
                    <div className="text-sm font-medium mb-3">Import from Excel</div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div className="col-span-3">
                        <Input 
                          type="file" 
                          accept=".xlsx,.xls" 
                          onChange={handleFileChange}
                          className="bg-white text-gray-900 border-gray-300"
                        />
                      </div>
                      <div>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={handleProcessExcel}
                          disabled={!excelFile}
                          className="w-full bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200"
                        >
                          Import
                        </Button>
                      </div>
                    </div>
                    {importError && (
                      <p className="text-sm text-red-500 mt-2">{importError}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-700 mt-3 bg-blue-50 p-3 rounded-md">
                      Excel format: Column A = Data GB, Column B = Price (GHS)
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-6 items-center gap-4">
              <Label htmlFor="isActive" className="text-right col-span-1">
                Active
              </Label>
              <div className="flex items-center space-x-2 col-span-5">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="text-sm text-gray-700">
                  {isActive ? 'Profile is active' : 'Profile is inactive'}
                </Label>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isEditing ? 'Save Changes' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Users Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {currentProfile?.name} - Manage Users
            </DialogTitle>
          </DialogHeader>
          
          {/* Current users assigned to this profile */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Assigned Users ({profileUsers.length})</h3>
            {profileUsers.length > 0 ? (
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profileUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => removeUserFromProfile(user.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-700 bg-gray-50 rounded">
                No users assigned to this profile yet
              </div>
            )}
          </div>
          
          {/* All users for assignment */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">All Users</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchAllUsers} 
                className="text-xs"
              >
                <RefreshCcw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
            
            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700 mx-auto"></div>
                <p className="text-sm text-gray-700 mt-2">Loading users...</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.length > 0 ? (
                      allUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="capitalize">{user.role}</TableCell>
                          <TableCell>
                            {isUserAssigned(user.id) ? (
                              <Check className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => assignUserToProfile(user.id)}
                              >
                                Assign
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-700">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)} className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
