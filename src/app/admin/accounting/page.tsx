"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download, FileText, Loader, Users, DollarSign, User } from 'lucide-react';
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
      console.log('Fetching permissions for user:', { userId, userRole });
      
      if (!userId) {
        console.log('No userId found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
        console.log('Permissions API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Permissions API response:', data);
          
          if (data.success) {
            const permissionNames = data.permissions.map((p: any) => p.name);
            console.log('Setting permissions:', permissionNames);
            setPermissions(permissionNames);
          }
        } else {
          console.error('Permissions API failed with status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
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
      console.error('Error loading users:', error);
      setErrorMessage('Failed to load users. Please try again.');
    } finally {
      setIsUserListLoading(false);
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
      console.error('Error generating bill:', error);
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
    </div>
  );
}
