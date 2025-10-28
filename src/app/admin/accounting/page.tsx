"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download, FileText, Loader, Users, DollarSign, User, TrendingUp, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Order } from '@/lib/costCalculationMiddleware';
import NotAuthorized from '@/components/NotAuthorized';

// Hook to check RBAC permissions
function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPermissions = async () => {
      const userId = (session?.user as any)?.id;
      const userRole = (session?.user as any)?.role;
      // Console log removed for security
      
      if (!userId) {
        // Console log removed for security
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
        // Console log removed for security
        
        if (response.ok) {
          const data = await response.json();
          // Console log removed for security
          
          if (data.success) {
            const permissionNames = data.permissions.map((p: any) => p.name);
            // Console log removed for security
            setPermissions(permissionNames);
          }
        } else {
          // Console statement removed for security
        }
      } catch (error) {
        // Console statement removed for security
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [(session?.user as any)?.id]);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  return { permissions, loading, hasPermission, hasAnyPermission };
}

type UserOption = {
  id: number;
  name: string;
  email: string;
};

export default function AccountingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
  const [isLoading, setIsLoading] = useState(true);
  const [dateValue, setDateValue] = useState<Date | undefined>(new Date());
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [billingData, setBillingData] = useState<Order[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalData, setTotalData] = useState<number>(0);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUserListLoading, setIsUserListLoading] = useState(false);
  
  // Account Manager Sales states
  const [activeTab, setActiveTab] = useState<'user-bill' | 'account-manager-sales'>('user-bill');
  const [salesDateValue, setSalesDateValue] = useState<Date | undefined>(new Date());
  const [accountManagers, setAccountManagers] = useState<any[]>([]);
  const [selectedAccountManager, setSelectedAccountManager] = useState<string>('all');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Check authentication and permissions
  useEffect(() => {
    if (status === 'authenticated' && session) {
      setIsLoading(false);
    } else if (status === 'unauthenticated') {
      // Redirect to login if not authenticated
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Load users when the component mounts and user has permission
  useEffect(() => {
    if (!permissionsLoading && hasPermission('admin.accounting') && !isUserListLoading) {
      loadUsers();
      loadAccountManagers();
    }
  }, [hasPermission, permissionsLoading, isUserListLoading]);

  // Function to load all users
  const loadUsers = async () => {
    try {
      setIsUserListLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      // Console statement removed for security
      setErrorMessage('Failed to load users. Please try again.');
    } finally {
      setIsUserListLoading(false);
    }
  };

  // Function to load account managers
  const loadAccountManagers = async () => {
    try {
      const response = await fetch('/api/admin/user-assignments');
      
      if (!response.ok) {
        throw new Error('Failed to load account managers');
      }
      
      const data = await response.json();
      setAccountManagers(data.accountManagers);
    } catch (error) {
      console.error('Error loading account managers:', error);
    }
  };

  // Function to generate bill
  const generateBill = async () => {
    if (!selectedUser) {
      setErrorMessage('Please select a user');
      return;
    }
    
    if (!dateValue) {
      setErrorMessage('Please select a date');
      return;
    }
    
    try {
      setIsLoadingBill(true);
      setErrorMessage(null);
      
      const formattedDate = format(dateValue, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/admin/accounting/user-bill?userId=${selectedUser}&date=${formattedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate bill');
      }
      
      const data = await response.json();
      setBillingData(data.orders || []);
      setTotalAmount(data.totalAmount || 0);
      setTotalData(data.totalData || 0);
    } catch (error) {
      // Console statement removed for security
      setErrorMessage('Failed to generate bill. Please try again.');
    } finally {
      setIsLoadingBill(false);
    }
  };

  // Function to export bill as CSV
  const exportBillAsCsv = () => {
    if (billingData.length === 0) return;
    
    // Get selected user name
    const user = users.find(u => u.id.toString() === selectedUser);
    const userName = user ? user.name : 'User';
    
    // Create CSV content
    const headers = ['Date', 'Time', 'Order ID', 'Data (GB)', 'Cost (GHS)'];
    const rows = billingData.map(order => [
      order.date,
      order.time,
      order.id,
      order.totalData.toFixed(2),
      order.cost ? order.cost.toFixed(2) : (order.estimatedCost ? order.estimatedCost.toFixed(2) : '0.00')
    ]);
    
    // Add summary row
    rows.push(['', '', 'TOTAL', totalData.toFixed(2), totalAmount.toFixed(2)]);
    
    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${userName}-Bill-${format(dateValue || new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to generate account manager sales report
  const generateSalesReport = async () => {
    if (!salesDateValue) {
      setErrorMessage('Please select a date for sales report');
      return;
    }
    
    try {
      setIsLoadingSales(true);
      setErrorMessage(null);
      
      const formattedDate = format(salesDateValue, 'yyyy-MM-dd');
      const params = new URLSearchParams({ date: formattedDate });
      
      if (selectedAccountManager && selectedAccountManager !== 'all') {
        params.append('accountManagerId', selectedAccountManager);
      }
      
      const response = await fetch(`/api/admin/account-manager-sales?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate sales report');
      }
      
      const data = await response.json();
      setSalesData(data.data || []);
    } catch (error) {
      console.error('Error generating sales report:', error);
      setErrorMessage('Failed to generate sales report. Please try again.');
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Function to export sales report as CSV
  const exportSalesReportAsCsv = () => {
    if (salesData.length === 0) return;
    
    const formattedDate = format(salesDateValue || new Date(), 'yyyy-MM-dd');
    
    // Create CSV content
    const headers = [
      'Account Manager',
      'Email',
      'Role',
      'Assigned Users',
      'Total Orders',
      'Total Sales (GHS)',
      'Total Data (GB)'
    ];
    
    const rows = salesData.map(manager => [
      manager.account_manager_name,
      manager.account_manager_email,
      manager.account_manager_role,
      manager.assigned_users_count,
      manager.total_orders,
      Number(manager.total_sales || manager.total_estimated_sales || 0).toFixed(2),
      Number(manager.total_data_gb || 0).toFixed(2)
    ]);
    
    // Add totals row
    const totalSales = salesData.reduce((sum, manager) => sum + Number(manager.total_sales || manager.total_estimated_sales || 0), 0);
    const totalData = salesData.reduce((sum, manager) => sum + Number(manager.total_data_gb || 0), 0);
    const totalOrders = salesData.reduce((sum, manager) => sum + Number(manager.total_orders || 0), 0);
    
    rows.push(['TOTAL', '', '', '', totalOrders.toString(), totalSales.toFixed(2), totalData.toFixed(2)]);
    
    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Account-Manager-Sales-${formattedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading spinner while checking permissions
  if (isLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show unauthorized component if user doesn't have accounting permission
  if (!hasPermission('admin.accounting')) {
    return <NotAuthorized />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <DollarSign className="h-8 w-8 text-amber-500" />
        Accounting
      </h1>
      
      {/* Accounting Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('user-bill')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'user-bill' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <User className="w-4 h-4" />
              User Billing
            </button>
            
            <button 
              onClick={() => setActiveTab('account-manager-sales')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'account-manager-sales' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Account Manager Sales
            </button>
          </div>
        </div>
      </div>
      
      {activeTab === 'user-bill' ? (
        <>
        <Card className="mb-8">
          <CardHeader>
          <CardTitle>Generate User Bill</CardTitle>
          <CardDescription>
            Select a user and date to generate a billing statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User selection */}
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="user-select" className="w-full" disabled={isUserListLoading}>
                  {isUserListLoading ? (
                    <div className="flex items-center">
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Loading users...
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a user" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-gray-700">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date selection */}
            <div className="space-y-2">
              <Label htmlFor="date-select">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-select"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateValue && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue ? format(dateValue, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={setDateValue}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Generate button */}
            <div className="flex items-end">
              <Button 
                className="w-full" 
                onClick={generateBill} 
                disabled={isLoadingBill || !selectedUser || !dateValue}
              >
                {isLoadingBill ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Bill
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Billing results */}
      {billingData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Billing Statement</CardTitle>
              <CardDescription>
                {users.find(u => u.id.toString() === selectedUser)?.name} - {dateValue ? format(dateValue, 'MMMM d, yyyy') : ''}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportBillAsCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border-b">Time</th>
                    <th className="text-left p-3 border-b">Order ID</th>
                    <th className="text-left p-3 border-b">Data (GB)</th>
                    <th className="text-right p-3 border-b">Cost (GHS)</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.map(order => (
                    <tr key={order.id} className="border-b">
                      <td className="p-3">{order.time}</td>
                      <td className="p-3 font-mono text-sm">{order.id}</td>
                      <td className="p-3">{order.totalData.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        {new Intl.NumberFormat('en-GH', { 
                          style: 'currency', 
                          currency: 'GHS',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        }).format(order.cost || order.estimatedCost || 0)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-3" colSpan={2}>Total</td>
                    <td className="p-3">{totalData.toFixed(2)} GB</td>
                    <td className="p-3 text-right">
                      {new Intl.NumberFormat('en-GH', { 
                        style: 'currency', 
                        currency: 'GHS',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      }).format(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-blue-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">User</p>
                      <h3 className="text-xl font-bold">
                        {users.find(u => u.id.toString() === selectedUser)?.name || 'User'}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-700">
                      {users.find(u => u.id.toString() === selectedUser)?.email || '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-amber-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Amount</p>
                      <h3 className="text-xl font-bold">
                        {new Intl.NumberFormat('en-GH', { 
                          style: 'currency', 
                          currency: 'GHS',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        }).format(totalAmount)}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Total Data</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {totalData.toFixed(2)} GB
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      ) : activeTab === 'account-manager-sales' ? (
        // Account Manager Sales Tab
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account Manager Sales Report</CardTitle>
              <CardDescription>
                View sales performance by account manager for a specific date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Date selection */}
                <div className="space-y-2">
                  <Label htmlFor="sales-date-select">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="sales-date-select"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !salesDateValue && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {salesDateValue ? format(salesDateValue, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={salesDateValue}
                        onSelect={setSalesDateValue}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Account Manager selection (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="account-manager-select">Account Manager (Optional)</Label>
                  <Select value={selectedAccountManager} onValueChange={setSelectedAccountManager}>
                    <SelectTrigger id="account-manager-select" className="w-full">
                      <SelectValue placeholder="All account managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Account Managers</SelectItem>
                      {accountManagers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex flex-col">
                            <span>{manager.name}</span>
                            <span className="text-xs text-gray-700">{manager.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Generate button */}
                <div className="flex items-end">
                  <Button 
                    className="w-full" 
                    onClick={generateSalesReport} 
                    disabled={isLoadingSales || !salesDateValue}
                  >
                    {isLoadingSales ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Error message for sales */}
              {errorMessage && activeTab === 'account-manager-sales' && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
                  {errorMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Report Results */}
          {salesData.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Account Manager Sales Report</CardTitle>
                  <CardDescription>
                    Sales performance for {salesDateValue ? format(salesDateValue, 'MMMM d, yyyy') : ''}
                    {selectedAccountManager && selectedAccountManager !== 'all' && ` - ${accountManagers.find(m => m.id === selectedAccountManager)?.name}`}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={exportSalesReportAsCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-3 border-b">Account Manager</th>
                        <th className="text-left p-3 border-b">Role</th>
                        <th className="text-right p-3 border-b">Assigned Users</th>
                        <th className="text-right p-3 border-b">Orders</th>
                        <th className="text-right p-3 border-b">Total Sales (GHS)</th>
                        <th className="text-right p-3 border-b">Data (GB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map(manager => (
                        <tr key={manager.account_manager_id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-gray-900">{manager.account_manager_name}</div>
                              <div className="text-sm text-gray-700">{manager.account_manager_email}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {manager.account_manager_role?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">{manager.assigned_users_count}</td>
                          <td className="p-3 text-right">{manager.total_orders}</td>
                          <td className="p-3 text-right">
                            {new Intl.NumberFormat('en-GH', { 
                              style: 'currency', 
                              currency: 'GHS',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2 
                            }).format(manager.total_sales || manager.total_estimated_sales || 0)}
                          </td>
                          <td className="p-3 text-right">
                            {Number(manager.total_data_gb || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="p-3" colSpan={3}>Total</td>
                        <td className="p-3 text-right">
                          {salesData.reduce((sum, manager) => sum + (manager.total_orders || 0), 0)}
                        </td>
                        <td className="p-3 text-right">
                          {new Intl.NumberFormat('en-GH', { 
                            style: 'currency', 
                            currency: 'GHS',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          }).format(salesData.reduce((sum, manager) => sum + (manager.total_sales || manager.total_estimated_sales || 0), 0))}
                        </td>
                        <td className="p-3 text-right">
                          {salesData.reduce((sum, manager) => sum + Number(manager.total_data_gb || 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Sales Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-500 mr-4" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Active Account Managers</p>
                          <h3 className="text-xl font-bold">
                            {salesData.filter(m => m.total_orders > 0).length}
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-amber-500 mr-4" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total Sales</p>
                          <h3 className="text-xl font-bold">
                            {new Intl.NumberFormat('en-GH', { 
                              style: 'currency', 
                              currency: 'GHS',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2 
                            }).format(salesData.reduce((sum, manager) => sum + (manager.total_sales || manager.total_estimated_sales || 0), 0))}
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-green-500 mr-4" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total Orders</p>
                          <h3 className="text-xl font-bold">
                            {salesData.reduce((sum, manager) => sum + (manager.total_orders || 0), 0)}
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}


