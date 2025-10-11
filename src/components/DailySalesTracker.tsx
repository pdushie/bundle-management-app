"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  Database,
  ArrowLeft,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Types for daily sales data
interface DailySalesDetail {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  cost: number | null;
  estimatedCost: number | null;
  pricingProfileName: string;
  amount: number;
}

interface DailySalesBreakdown {
  userName: string;
  userEmail: string;
  totalSales: number;
  totalData: number;
  totalOrders: number;
  orders: DailySalesDetail[];
}

interface DailySalesResponse {
  date: string;
  summary: {
    totalSales: number;
    totalData: number;
    totalOrders: number;
    totalEntries: number;
  };
  orders: DailySalesDetail[];
  userBreakdown: DailySalesBreakdown[];
}

interface DailySummary {
  date: string;
  totalSales: number;
  totalData: number;
  totalOrders: number;
  totalEntries: number;
  uniqueUsers: number;
}

interface SalesSummaryResponse {
  startDate: string;
  endDate: string;
  dailySales: DailySummary[];
  grandTotal: {
    totalSales: number;
    totalData: number;
    totalOrders: number;
    totalEntries: number;
    uniqueUsers: number;
    daysWithSales: number;
  };
}

interface DailySalesTrackerProps {
  onBack?: () => void;
}

export default function DailySalesTracker({ onBack }: DailySalesTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [dailySummary, setDailySummary] = useState<SalesSummaryResponse | null>(null);
  const [dailyDetails, setDailyDetails] = useState<DailySalesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'summary' | 'details'>('summary');

  // Load 30-day summary on component mount
  useEffect(() => {
    loadDailySummary();
  }, []);

  const loadDailySummary = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/accounting/daily-sales');
      
      if (!response.ok) {
        throw new Error('Failed to load daily sales summary');
      }
      
      const data = await response.json();
      setDailySummary(data);
    } catch (error) {
      console.error('Error loading daily sales summary:', error);
      setError('Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDailyDetails = async (date: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/accounting/daily-sales?date=${date}`);
      
      if (!response.ok) {
        throw new Error('Failed to load daily sales details');
      }
      
      const data = await response.json();
      setDailyDetails(data);
      setView('details');
    } catch (error) {
      console.error('Error loading daily sales details:', error);
      setError('Failed to load daily sales details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const dateString = format(date, 'yyyy-MM-dd');
      loadDailyDetails(dateString);
    }
  };

  const handleBackToSummary = () => {
    setView('summary');
    setDailyDetails(null);
    setSelectedDate(undefined);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Daily Details View
  if (view === 'details' && dailyDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToSummary}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Summary
            </Button>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Daily Sales Details</h2>
              <p className="text-sm sm:text-base text-gray-700">
                {format(selectedDate || new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDailySummary}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Sales</p>
                  <h3 className="text-2xl font-bold text-green-700">
                    {formatCurrency(dailyDetails.summary.totalSales)}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Orders</p>
                  <h3 className="text-2xl font-bold text-blue-700">
                    {dailyDetails.summary.totalOrders}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Data</p>
                  <h3 className="text-2xl font-bold text-purple-700">
                    {dailyDetails.summary.totalData.toFixed(2)} GB
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Unique Users</p>
                  <h3 className="text-2xl font-bold text-orange-700">
                    {dailyDetails.userBreakdown.length}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Breakdown */}
        {dailyDetails.userBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sales by User</CardTitle>
              <CardDescription>
                Breakdown of sales by user for {format(selectedDate || new Date(), 'MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">User</th>
                      <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Email</th>
                      <th className="text-right p-2 sm:p-3 text-xs sm:text-sm">Orders</th>
                      <th className="text-right p-2 sm:p-3 text-xs sm:text-sm">Data (GB)</th>
                      <th className="text-right p-2 sm:p-3 text-xs sm:text-sm">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyDetails.userBreakdown.map((user, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{user.userName}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-900">{user.userEmail}</td>
                        <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">{user.totalOrders}</td>
                        <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">{user.totalData.toFixed(2)}</td>
                        <td className="p-2 sm:p-3 text-right font-bold text-green-700 text-xs sm:text-sm">
                          {formatCurrency(user.totalSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Orders */}
        {dailyDetails.orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                All orders processed on {format(selectedDate || new Date(), 'MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">User</th>
                      <th className="text-left p-3">Order ID</th>
                      <th className="text-right p-3">Data (GB)</th>
                      <th className="text-right p-3">Entries</th>
                      <th className="text-right p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyDetails.orders.map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-3">{order.time}</td>
                        <td className="p-3">{order.userName}</td>
                        <td className="p-3 font-mono text-sm">{order.id.substring(0, 8)}...</td>
                        <td className="p-3 text-right">{order.totalData.toFixed(2)}</td>
                        <td className="p-3 text-right">{order.totalCount}</td>
                        <td className="p-3 text-right font-bold text-green-700">
                          {formatCurrency(order.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Summary View
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
            <h2 className="text-2xl font-bold">Daily Sales Overview</h2>
            <p className="text-gray-700">Track sales performance by date</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                View Specific Date
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 z-30 bg-white border border-gray-200 shadow-lg rounded-md" 
              side="bottom" 
              align="center" 
              sideOffset={12}
              avoidCollisions={false}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDailySummary}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* Grand Total Summary Cards */}
      {dailySummary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Sales (30 days)</p>
                    <h3 className="text-2xl font-bold text-green-700">
                      {formatCurrency(dailySummary.grandTotal.totalSales)}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Orders</p>
                    <h3 className="text-2xl font-bold text-blue-700">
                      {dailySummary.grandTotal.totalOrders}
                    </h3>
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
                      {dailySummary.grandTotal.totalData.toFixed(2)} GB
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Days with Sales</p>
                    <h3 className="text-2xl font-bold text-orange-700">
                      {dailySummary.grandTotal.daysWithSales}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Breakdown</CardTitle>
              <CardDescription>
                Sales data for the last 30 days (click on any date to view details)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Date</th>
                      <th className="text-right p-3">Orders</th>
                      <th className="text-right p-3">Users</th>
                      <th className="text-right p-3">Data (GB)</th>
                      <th className="text-right p-3">Sales</th>
                      <th className="text-center p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummary.dailySales.map((day) => (
                      <tr key={day.date} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">
                          {format(new Date(day.date), 'MMM d, yyyy')}
                        </td>
                        <td className="p-3 text-right">{day.totalOrders}</td>
                        <td className="p-3 text-right">{day.uniqueUsers}</td>
                        <td className="p-3 text-right">{day.totalData.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-green-700">
                          {formatCurrency(day.totalSales)}
                        </td>
                        <td className="p-3 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => loadDailyDetails(day.date)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
