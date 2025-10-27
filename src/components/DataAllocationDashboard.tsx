"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Database, 
  TrendingUp, 
  Package,
  Users,
  ArrowLeft,
  Loader2,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
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
  Cell
} from 'recharts';

// Types for data allocation dashboard
interface SystemStats {
  totalDataGB: number;
  totalOrders: number;
  totalEntries: number;
  avgDailyDataGB: number;
  daysActive: number;
}

interface DailyDataAllocation {
  date: string;
  orderSystem: SystemStats;
  bundleAllocator: SystemStats;
  totalDataGB: number;
  totalOrders: number;
  totalEntries: number;
}

interface DataAllocationSummary {
  orderSystem: SystemStats;
  bundleAllocator: SystemStats;
  combined: SystemStats & { totalDays: number };
}

interface DataAllocationResponse {
  startDate: string;
  endDate: string;
  dailyData: DailyDataAllocation[];
  summary: DataAllocationSummary;
}

interface DataAllocationDashboardProps {
  onBack?: () => void;
}

export default function DataAllocationDashboard({ onBack }: DataAllocationDashboardProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [data, setData] = useState<DataAllocationResponse | null>(null);
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
      loadDataAllocationStats();
    }
  }, [dateRange, isClient]);

  const loadDataAllocationStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      // // Console log removed for security
      
      const response = await fetch(
        `/api/admin/accounting/data-allocation?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        // // Console statement removed for security
        throw new Error(`Failed to load data allocation statistics: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }
      
      const responseData = await response.json();
      // // Console log removed for security
      setData(responseData);
    } catch (error) {
      // // Console statement removed for security
      setError(`Failed to load data allocation statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Prepare chart data
  const chartData = data?.dailyData?.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    'Bundle Allocator': Number(day.bundleAllocator?.totalDataGB || 0),
    'Order System': Number(day.orderSystem?.totalDataGB || 0),
    total: Number(day.totalDataGB || 0)
  })) || [];

  // Pie chart data for system comparison
  const systemComparisonData = data?.summary ? [
    { 
      name: 'Bundle Allocator', 
      value: Number(data.summary.bundleAllocator?.totalDataGB || 0), 
      color: '#3b82f6' 
    },
    { 
      name: 'Order System', 
      value: Number(data.summary.orderSystem?.totalDataGB || 0), 
      color: '#10b981' 
    }
  ].filter(item => item.value > 0) : [];

  const COLORS = ['#3b82f6', '#10b981'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Header with title and back button */}
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
            <h2 className="text-2xl font-bold text-gray-900">Data Allocation Dashboard</h2>
            <p className="text-gray-900">Compare data processing between Bundle Allocator and Order System</p>
          </div>
        </div>
        
        {/* Date Range Controls */}
        <div className="flex flex-row items-center gap-3 flex-wrap">
          {/* Date Range Selector */}
          <div className="flex flex-row items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-gray-700">From:</label>
              <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 text-gray-900 hover:text-gray-900 justify-start px-3 py-2">
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{format(dateRange.from, 'MMM dd, yyyy')}</span>
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
            </div>
            
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-gray-700">To:</label>
              <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 text-gray-900 hover:text-gray-900 justify-start px-3 py-2">
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{format(dateRange.to, 'MMM dd, yyyy')}</span>
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
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDataAllocationStats}
            className="text-gray-900 hover:text-gray-900"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bundle Allocator Data</p>
                    <h3 className="text-2xl font-bold text-blue-700">
                      {formatDataSize(data.summary.bundleAllocator.totalDataGB)}
                    </h3>
                    <p className="text-xs text-gray-900">
                      {data.summary.bundleAllocator.totalOrders} orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order System Data</p>
                    <h3 className="text-2xl font-bold text-green-700">
                      {formatDataSize(data.summary.orderSystem.totalDataGB)}
                    </h3>
                    <p className="text-xs text-gray-900">
                      {data.summary.orderSystem.totalOrders} orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Data Processed</p>
                    <h3 className="text-2xl font-bold text-purple-700">
                      {formatDataSize(data.summary.combined.totalDataGB)}
                    </h3>
                    <p className="text-xs text-gray-900">
                      {data.summary.combined.totalOrders} total orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Daily Average</p>
                    <h3 className="text-2xl font-bold text-orange-700">
                      {formatDataSize(data.summary.combined.avgDailyDataGB)}
                    </h3>
                    <p className="text-xs text-gray-900">
                      over {data.summary.combined.totalDays} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Data Allocation Bar Chart */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <BarChart3 className="h-5 w-5" />
                  Daily Data Allocation
                </CardTitle>
                <CardDescription className="text-gray-900">
                  Comparison of data processed daily by each system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {!isClient ? (
                    <div className="flex items-center justify-center h-full text-gray-900">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading chart...
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={formatDataSize} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatDataSize(value), name]}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: '#111827'
                          }}
                          labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Bar dataKey="Bundle Allocator" fill="#3b82f6" />
                        <Bar dataKey="Order System" fill="#10b981" />
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

            {/* System Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <PieChart className="h-5 w-5" />
                  System Distribution
                </CardTitle>
                <CardDescription className="text-gray-900">
                  Total data allocation by processing system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[420px]">
                  {!isClient ? (
                    <div className="flex items-center justify-center h-full text-gray-900">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading chart...
                    </div>
                  ) : systemComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                        <Pie
                          data={systemComparisonData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => {
                            const shortName = name === 'Bundle Allocator' ? 'Bundle\nAllocator' : 'Order\nSystem';
                            return `${shortName}\n${((percent || 0) * 100).toFixed(1)}%`;
                          }}
                          outerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {systemComparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatDataSize(value), name]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: '#111827'
                          }}
                          labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-900">
                      No data to display
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">System Performance Comparison</CardTitle>
              <CardDescription className="text-gray-900">
                Detailed breakdown of processing statistics by system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-gray-900 font-medium">System</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Total Data</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Total Orders</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Total Entries</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Avg Daily Data</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Active Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium text-blue-700">Bundle Allocator</td>
                      <td className="p-3 text-right text-gray-900">{formatDataSize(data.summary.bundleAllocator.totalDataGB)}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.bundleAllocator.totalOrders.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.bundleAllocator.totalEntries.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{formatDataSize(data.summary.bundleAllocator.avgDailyDataGB)}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.bundleAllocator.daysActive}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium text-green-700">Order System</td>
                      <td className="p-3 text-right text-gray-900">{formatDataSize(data.summary.orderSystem.totalDataGB)}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.orderSystem.totalOrders.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.orderSystem.totalEntries.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{formatDataSize(data.summary.orderSystem.avgDailyDataGB)}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.orderSystem.daysActive}</td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td className="p-3 text-purple-700">Combined Total</td>
                      <td className="p-3 text-right text-gray-900">{formatDataSize(data.summary.combined.totalDataGB)}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.combined.totalOrders.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.combined.totalEntries.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{formatDataSize(data.summary.combined.avgDailyDataGB)}</td>
                      <td className="p-3 text-right text-gray-900">{data.summary.combined.totalDays}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Daily Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">Daily Data Breakdown</CardTitle>
              <CardDescription className="text-gray-900">
                Day-by-day comparison of data allocation by system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-gray-900 font-medium">Date</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Bundle Allocator</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Order System</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Total Data</th>
                      <th className="text-right p-3 text-gray-900 font-medium">Total Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyData.slice(0, 10).map((day) => (
                      <tr key={day.date} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">
                          {format(new Date(day.date), 'MMM d, yyyy')}
                        </td>
                        <td className="p-3 text-right text-blue-700">
                          {formatDataSize(day.bundleAllocator.totalDataGB)}
                        </td>
                        <td className="p-3 text-right text-green-700">
                          {formatDataSize(day.orderSystem.totalDataGB)}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          {formatDataSize(day.totalDataGB)}
                        </td>
                        <td className="p-3 text-right text-gray-900">
                          {day.totalOrders}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.dailyData.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-900">
                  Showing last 10 days. Total: {data.dailyData.length} days
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


