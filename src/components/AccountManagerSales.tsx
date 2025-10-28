"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download, Loader, BarChart3, Users, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AccountManager {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SalesData {
  account_manager_id: string;
  account_manager_name: string;
  account_manager_email: string;
  account_manager_role: string;
  assigned_users_count: number;
  total_orders: number;
  total_sales: number;
  total_estimated_sales: number;
  total_data_gb: number;
}

export default function AccountManagerSales() {
  const { data: session } = useSession();
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [selectedAccountManager, setSelectedAccountManager] = useState<string>('all');
  const [salesDateValue, setSalesDateValue] = useState<Date | undefined>(new Date());
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if user has admin privileges
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super_admin' || session?.user?.role === 'superadmin' || session?.user?.role === 'standard_admin';

  // Fetch account managers on component mount
  useEffect(() => {
    if (isAdmin) {
      fetchAccountManagers();
    }
  }, [isAdmin]);

  const fetchAccountManagers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // Filter for admin users only
        const admins = data.users.filter((user: any) => 
          ['admin', 'super_admin', 'superadmin', 'standard_admin'].includes(user.role)
        );
        setAccountManagers(admins);
      }
    } catch (error) {
      console.error('Error fetching account managers:', error);
    }
  };

  const generateSalesReport = async () => {
    if (!salesDateValue) {
      setErrorMessage('Please select a date');
      return;
    }

    setIsLoadingSales(true);
    setErrorMessage(null);

    try {
      const formattedDate = format(salesDateValue, 'yyyy-MM-dd');
      const params = new URLSearchParams({ date: formattedDate });
      
      if (selectedAccountManager && selectedAccountManager !== 'all') {
        params.append('accountManagerId', selectedAccountManager);
      }

      const response = await fetch(`/api/admin/account-manager-sales?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate sales report: ${response.status}`);
      }

      const data = await response.json();
      setSalesData(data.data || []);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to generate sales report');
    } finally {
      setIsLoadingSales(false);
    }
  };

  const exportSalesReportAsCsv = () => {
    if (salesData.length === 0) return;

    const headers = ['Account Manager', 'Email', 'Role', 'Assigned Users', 'Total Orders', 'Total Sales (GHS)'];
    const csvContent = [
      headers.join(','),
      ...salesData.map(manager => [
        `"${manager.account_manager_name}"`,
        `"${manager.account_manager_email}"`,
        `"${manager.account_manager_role}"`,
        manager.assigned_users_count || 0,
        manager.total_orders || 0,
        (manager.total_sales || 0).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `account_manager_sales_${format(salesDateValue!, 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You need admin privileges to view account manager sales reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Account Manager Sales Report
          </CardTitle>
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

            {/* Account Manager selection */}
            <div className="space-y-2">
              <Label htmlFor="account-manager-select">Account Manager</Label>
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

          {/* Error message */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Results */}
      {salesData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sales Report</CardTitle>
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
                    <th className="text-left p-3 border-b">Email</th>
                    <th className="text-left p-3 border-b">Role</th>
                    <th className="text-right p-3 border-b">Assigned Users</th>
                    <th className="text-right p-3 border-b">Total Orders</th>
                    <th className="text-right p-3 border-b">Total Sales (GHS)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map(manager => (
                    <tr key={manager.account_manager_id} className="border-b">
                      <td className="p-3 font-medium">{manager.account_manager_name}</td>
                      <td className="p-3 text-gray-600">{manager.account_manager_email}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {manager.account_manager_role}
                        </span>
                      </td>
                      <td className="p-3 text-right">{manager.assigned_users_count || 0}</td>
                      <td className="p-3 text-right">{manager.total_orders || 0}</td>
                      <td className="p-3 text-right font-medium">
                        {new Intl.NumberFormat('en-GH', { 
                          style: 'currency', 
                          currency: 'GHS',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        }).format(manager.total_sales || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Account Managers</p>
                      <h3 className="text-xl font-bold">{salesData.length}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Sales</p>
                      <h3 className="text-xl font-bold">
                        {new Intl.NumberFormat('en-GH', { 
                          style: 'currency', 
                          currency: 'GHS',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        }).format(salesData.reduce((sum, manager) => sum + (manager.total_sales || 0), 0))}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-amber-500 mr-4" />
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
    </div>
  );
}