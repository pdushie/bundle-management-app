"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarIcon, 
  User, 
  Package2, 
  Calculator,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  Database,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

// Types for user package breakdown
interface PackageBreakdown {
  packageSize: string;
  sizeGB: number;
  quantity: number;
  totalGB: number;
  avgAllocationPerEntry: number;
  minAllocation: number;
  maxAllocation: number;
  totalCost: number;
  avgCostPerEntry: number;
  orderIds: string[];
}

interface UserPackageBreakdownResponse {
  userId: number;
  userName: string;
  userEmail: string;
  date: string;
  packages: PackageBreakdown[];
  summary: {
    totalPackages: number;
    totalQuantity: number;
    totalDataGB: number;
    totalOrders: number;
    totalCost: number;
    averagePackageSize: number;
  };
}

interface UserPackageBreakdownProps {
  onBack?: () => void;
}

export default function UserPackageBreakdown({ onBack }: UserPackageBreakdownProps) {
  const [users, setUsers] = useState<{id: number, name: string, email: string}[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Get date in UTC (YYYY-MM-DD) - default to 3 days ago for better data availability
  function getDateUTC(daysAgo = 0) {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - daysAgo);
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function getTodayUTC() {
    return getDateUTC(0);
  }

  // Default to a few days ago where data is more likely to exist
  const [selectedDate, setSelectedDate] = useState<string>(getDateUTC(2));
  const [data, setData] = useState<UserPackageBreakdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setError('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error loading users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserPackageBreakdown = async () => {
    if (!selectedUserId || !selectedDate) {
      setError('Please select a user and date');
      return;
    }

    setIsLoading(true);
    setData(null);
    setError(null);
    
    try {
      console.log('Loading user package breakdown for:', { userId: selectedUserId, date: selectedDate });
      
      const response = await fetch(
        `/api/admin/accounting/user-package-breakdown?userId=${selectedUserId}&date=${selectedDate}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to load user package breakdown: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Received user package data:', responseData);
      setData(responseData);
      
      if (responseData.packages?.length === 0) {
        const selectedUser = users.find(u => u.id.toString() === selectedUserId);
        setError(`No packages found for ${selectedUser?.name || 'this user'} on ${format(new Date(selectedDate), 'MMMM d, yyyy')}. Try selecting a different date or user.`);
      }
    } catch (error) {
      console.error('Error loading user package breakdown:', error);
      setError(`Failed to load user package breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDataSize = (gb: number) => {
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(value);
  };

  const handleRefresh = () => {
    setSelectedUserId(null);
    setData(null);
    setSelectedDate(getDateUTC(2)); // Reset to 2 days ago
    setError(null);
    fetchUsers();
  };

  const selectedUserName = users.find(u => u.id.toString() === selectedUserId)?.name || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">User Package Breakdown</h2>
            <p className="text-gray-600">View data packages purchased by a specific user on a given date</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* User and Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Criteria
          </CardTitle>
          <CardDescription>
            Select a user and date to view their package purchases. Recent data is more likely to be available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* User Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Select User</label>
              <Select 
                disabled={loadingUsers}
                value={selectedUserId || undefined}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger className="w-full">
                  {loadingUsers ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a user" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Select Date</label>
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
                <input 
                  type="date"
                  value={selectedDate}
                  max={getTodayUTC()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="ml-2 text-xs text-gray-700">(UTC)</span>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button 
                onClick={loadUserPackageBreakdown} 
                disabled={isLoading || !selectedUserId || !selectedDate}
                className="w-full"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> Search Packages</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">User</p>
                    <h3 className="text-lg font-bold text-blue-700">
                      {data.userName}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {format(new Date(data.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package2 className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Package Types</p>
                    <h3 className="text-2xl font-bold text-green-700">
                      {data.summary.totalPackages}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {data.summary.totalQuantity} total items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Data</p>
                    <h3 className="text-2xl font-bold text-purple-700">
                      {formatDataSize(data.summary.totalDataGB)}
                    </h3>
                    <p className="text-xs text-gray-600">
                      from {data.summary.totalOrders} orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Cost</p>
                    <h3 className="text-2xl font-bold text-orange-700">
                      {formatCurrency(data.summary.totalCost)}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Avg: {formatDataSize(data.summary.averagePackageSize)}/item
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Package Breakdown Table */}
          {data.packages.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Package Breakdown for {selectedUserName} on {format(new Date(data.date), 'MMMM d, yyyy')}</CardTitle>
                <CardDescription>
                  Detailed breakdown of data packages purchased
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Package Size</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Total Data</th>
                        <th className="text-right p-3">Total Cost</th>
                        <th className="text-right p-3">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.packages.map((pkg, index) => (
                        <tr key={pkg.packageSize} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ 
                                  backgroundColor: `hsl(${index * 40}, 70%, 50%)` 
                                }}
                              />
                              {pkg.packageSize}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                              {pkg.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium text-blue-700">
                            {formatDataSize(pkg.totalGB)}
                          </td>
                          <td className="p-3 text-right text-green-700 font-medium">
                            {formatCurrency(pkg.totalCost)}
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm text-gray-600">
                              {pkg.orderIds.length} order{pkg.orderIds.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold border-t-2">
                        <td className="p-3">TOTAL</td>
                        <td className="p-3 text-right text-blue-700">
                          {data.summary.totalQuantity}
                        </td>
                        <td className="p-3 text-right text-blue-700">
                          {formatDataSize(data.summary.totalDataGB)}
                        </td>
                        <td className="p-3 text-right text-green-700">
                          {formatCurrency(data.summary.totalCost)}
                        </td>
                        <td className="p-3 text-right">
                          {data.summary.totalOrders}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Package2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Packages Found</h3>
                <p className="text-gray-700">
                  {selectedUserName} did not purchase any data packages on {format(new Date(selectedDate), 'MMMM d, yyyy')}.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
