"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Package2, 
  TrendingUp, 
  Users,
  ArrowLeft,
  Loader2,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
  Award
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Types for data categorizer dashboard
interface DataPackageCategory {
  packageSize: string;
  sizeGB: number;
  totalOrders: number;
  totalQuantity: number;
  uniqueUsers: number;
  totalValue: number;
  avgPrice: number;
}

interface UserCategoryBreakdown {
  userId: number;
  userName: string;
  userEmail: string;
  categories: Array<{
    packageSize: string;
    quantity: number;
    totalGB: number;
    totalValue: number;
  }>;
  totalOrders: number;
  totalGB: number;
  totalValue: number;
}

interface DataCategorizerResponse {
  startDate: string;
  endDate: string;
  categories: DataPackageCategory[];
  userBreakdowns: UserCategoryBreakdown[];
  summary: {
    totalCategories: number;
    totalOrders: number;
    totalUsers: number;
    totalDataGB: number;
    totalValue: number;
    mostPopularCategory: string;
    averageOrderSize: number;
  };
}

interface DataCategorizerDashboardProps {
  onBack?: () => void;
}

export default function DataCategorizerDashboard({ onBack }: DataCategorizerDashboardProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [data, setData] = useState<DataCategorizerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load data on component mount and when date range changes
  useEffect(() => {
    if (isClient) {
      loadCategorizerStats();
    }
  }, [dateRange, isClient]);

  const loadCategorizerStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      console.log('Loading data categorizer stats for:', { startDate, endDate });
      
      const response = await fetch(
        `/api/admin/accounting/data-categorizer?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to load data categorizer statistics: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Received categorizer data:', responseData);
      setData(responseData);
    } catch (error) {
      console.error('Error loading categorizer stats:', error);
      setError(`Failed to load data categorizer statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Prepare chart data for package categories
  const categoryChartData = data?.categories?.map(cat => ({
    name: cat.packageSize,
    quantity: cat.totalQuantity,
    orders: cat.totalOrders,
    users: cat.uniqueUsers,
    value: cat.totalValue,
    avgPrice: cat.avgPrice
  })) || [];

  // Pie chart data for category distribution
  const categoryPieData = data?.categories?.slice(0, 8).map((cat, index) => ({
    name: cat.packageSize,
    value: cat.totalQuantity,
    color: `hsl(${index * 45}, 70%, 50%)`
  })) || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
            <h2 className="text-lg sm:text-2xl font-bold">Data Package Categorizer</h2>
            <p className="text-sm sm:text-base text-gray-900">Analyze data allocation purchases by package size and user patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'MMM dd, yyyy')}
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
                  selected={dateRange.from}
                  onSelect={(date) => {
                    if (date) {
                      setDateRange(prev => ({ ...prev, from: date }));
                      setShowFromCalendar(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-gray-900">to</span>
            
            <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.to, 'MMM dd, yyyy')}
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
                  selected={dateRange.to}
                  onSelect={(date) => {
                    if (date) {
                      setDateRange(prev => ({ ...prev, to: date }));
                      setShowToCalendar(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCategorizerStats}
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

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <Package2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Total Package Types</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-blue-700">
                      {data.summary.totalCategories}
                    </h3>
                    <p className="text-xs text-gray-900">
                      Different package sizes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Total Orders</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-green-700">
                      {data.summary.totalOrders.toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-900">
                      {formatDataSize(data.summary.totalDataGB)} allocated
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Active Users</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-purple-700">
                      {data.summary.totalUsers.toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-900">
                      Made purchases
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <Award className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Most Popular</p>
                    <h3 className="text-sm sm:text-lg font-bold text-orange-700">
                      {data.summary.mostPopularCategory || 'N/A'}
                    </h3>
                    <p className="text-xs text-gray-900">
                      Package category
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package Category Bar Chart */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Package Category Distribution
                </CardTitle>
                <CardDescription>
                  Quantity of packages purchased by size category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {!isClient ? (
                    <div className="flex items-center justify-center h-full text-gray-700">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading chart...
                    </div>
                  ) : categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'value') return [formatCurrency(value), 'Total Value'];
                            if (name === 'avgPrice') return [formatCurrency(value), 'Avg Price'];
                            return [value.toLocaleString(), name];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="quantity" fill="#3b82f6" name="Total Quantity" />
                        <Bar dataKey="orders" fill="#10b981" name="Unique Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-900">
                      No data available for the selected date range
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Market Share by Package Size
                </CardTitle>
                <CardDescription>
                  Percentage distribution of package purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[420px]">
                  {!isClient ? (
                    <div className="flex items-center justify-center h-full text-gray-700">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading chart...
                    </div>
                  ) : categoryPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}\n${((percent || 0) * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value.toLocaleString(), 'Purchases']}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-700">
                      No data to display
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Package Categories Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Package Analysis</CardTitle>
              <CardDescription>
                Comprehensive breakdown of data package purchases by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Package Size</th>
                      <th className="text-right p-3">Total Quantity</th>
                      <th className="text-right p-3">Unique Orders</th>
                      <th className="text-right p-3">Unique Users</th>
                      <th className="text-right p-3">Total Value</th>
                      <th className="text-right p-3">Avg Price</th>
                      <th className="text-right p-3">Market Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((category) => {
                      const totalQuantity = data.categories.reduce((sum, cat) => sum + cat.totalQuantity, 0);
                      const marketShare = totalQuantity > 0 ? (category.totalQuantity / totalQuantity) * 100 : 0;
                      
                      return (
                        <tr key={category.packageSize} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{category.packageSize}</td>
                          <td className="p-3 text-right font-bold text-blue-700">
                            {category.totalQuantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">{category.totalOrders.toLocaleString()}</td>
                          <td className="p-3 text-right">{category.uniqueUsers.toLocaleString()}</td>
                          <td className="p-3 text-right text-green-700">
                            {formatCurrency(category.totalValue)}
                          </td>
                          <td className="p-3 text-right">{formatCurrency(category.avgPrice)}</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {marketShare.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Data Allocation</CardTitle>
              <CardDescription>
                Users ranked by total data allocation volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">User</th>
                      <th className="text-right p-3">Total Orders</th>
                      <th className="text-right p-3">Total Data</th>
                      <th className="text-right p-3">Total Value</th>
                      <th className="text-left p-3">Favorite Categories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.userBreakdowns.slice(0, 20).map((user, index) => (
                      <tr key={`${user.userId}-${user.userEmail}-${index}`} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-gray-900">{user.userEmail}</div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold">
                          {user.totalOrders}
                        </td>
                        <td className="p-3 text-right text-blue-700">
                          {formatDataSize(user.totalGB)}
                        </td>
                        <td className="p-3 text-right text-green-700">
                          {formatCurrency(user.totalValue)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {user.categories.slice(0, 3).map((cat) => (
                              <span 
                                key={cat.packageSize}
                                className="px-2 py-1 bg-gray-100 text-gray-900 rounded text-xs sm:text-sm"
                              >
                                {cat.packageSize} ({cat.quantity})
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.userBreakdowns.length > 20 && (
                <div className="mt-4 text-center text-sm text-gray-900">
                  Showing top 20 users. Total: {data.userBreakdowns.length} users
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
