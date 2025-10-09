"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, FileText, Loader2, RefreshCw, AlertTriangle, TrendingUp, Receipt, BarChart3, Package2, User } from 'lucide-react';
import NotAuthorized from '@/components/NotAuthorized';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';
import { UserBillData } from '@/types/accounting';
import DailySalesTracker from '@/components/DailySalesTracker';
import DataAllocationDashboard from '@/components/DataAllocationDashboard';
import DataCategorizerDashboard from '@/components/DataCategorizerDashboard';
import UserPackageBreakdown from '@/components/UserPackageBreakdown';

// Tab options for the accounting app
type AccountingTab = 'user-billing' | 'daily-sales' | 'dashboard' | 'categorizer' | 'user-packages';

export default function AccountingApp({ tabActive = false }: { tabActive?: boolean }) {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<{id: number, name: string, email: string}[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Get today's date in UTC (YYYY-MM-DD) reliably
  function getTodayUTC() {
    const now = new Date();
    // Get the UTC year, month, and date
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1; // getUTCMonth is zero-based
    const day = now.getUTCDate();
    // Pad month and day to two digits
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const [selectedDate, setSelectedDate] = useState<string>(getTodayUTC());
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [billData, setBillData] = useState<UserBillData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccountingTab>('user-billing');
  
  // Check if user has admin privileges
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';

  // Reset data and refresh when tab becomes active
  useEffect(() => {
    if (tabActive && isAdmin) {
      // Reset state
      setSelectedUserId(null);
      setBillData(null);
  setSelectedDate(getTodayUTC());
      setErrorMessage(null);
      
      // Load fresh user data
      fetchUsers();
    }
  }, [tabActive, isAdmin]);

  // Load all users on component mount
  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
  }, [isAdmin]);

  // Function to fetch users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setErrorMessage('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage('Error loading users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchBillData = async () => {
    if (!selectedUserId || !selectedDate) {
      setErrorMessage('Please select a user and date');
      return;
    }

    setLoading(true);
    setBillData(null);
    setErrorMessage(null);
    
    try {
      const response = await fetch(`/api/admin/accounting/user-bill?userId=${selectedUserId}&date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Bill data received:', data);
        console.log('Username from API:', data.userName);
        console.log('User Email from API:', data.userEmail);
        
        // More detailed debugging of the name field
        if (data.userName === 'Unknown User') {
          console.log('WARNING: API returned "Unknown User" - checking why...');
          console.log('Selected User ID:', selectedUserId);
        }
        
        // Ensure userName is never empty or undefined by using email as fallback
        if (!data.userName || data.userName === 'Unknown User') {
          console.log('Using email as fallback for userName');
          data.userName = data.userEmail || 'Customer';
        }
        
        setBillData(data);
        
        if (data.orders?.length === 0) {
          setErrorMessage('No orders found for this user on the selected date');
        }
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to fetch bill data');
      }
    } catch (error) {
      console.error('Error fetching bill data:', error);
      setErrorMessage('An error occurred while fetching bill data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Reset state
    setSelectedUserId(null);
    setBillData(null);
  setSelectedDate(getTodayUTC());
    setErrorMessage(null);
    
    // Re-fetch users
    fetchUsers();
  };

  const exportBillAsCsv = () => {
    if (!billData || !billData.orders || billData.orders.length === 0) return;
    
    // Create CSV content
    const headers = ['Order ID', 'Time', 'Data (GB)', 'Entries', 'Amount (GHS)'];
    const rows = billData.orders.map((order: any) => [
      order.id,
      order.time,
      order.totalData.toFixed(2),
      order.totalCount,
      order.estimatedCost.toFixed(2)
    ]);
    
    // Add summary row
    rows.push(['', 'TOTAL', billData.totalData.toFixed(2), '', billData.totalAmount.toFixed(2)]);
    
    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `User-Bill-${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadPDF = () => {
    if (!billData || !billData.orders || billData.orders.length === 0) return;
    
    try {
      // Make sure we always have a valid userName
      const dataToSend = {
        ...billData,
        // Ensure userName is never empty or "Unknown User"
        userName: billData.userName === 'Unknown User' || !billData.userName
          ? (billData.userEmail || 'Customer') 
          : billData.userName
      };
      
      console.log('Generating PDF for:', dataToSend.userName);
      
      // Generate the PDF with the updated data
      generateInvoicePDF(dataToSend);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setErrorMessage('Failed to generate PDF invoice');
    }
  };

  // If not admin, show unauthorized message
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return <NotAuthorized />;
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {errorMessage && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Accounting Section Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('user-billing')}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'user-billing'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Receipt className="h-4 w-4" />
            User Billing
          </button>
          <button
            onClick={() => setActiveTab('daily-sales')}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'daily-sales'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Daily Sales
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('categorizer')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'categorizer'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package2 className="h-4 w-4" />
            Package Categorizer
          </button>
          <button
            onClick={() => setActiveTab('user-packages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'user-packages'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="h-4 w-4" />
            User Packages
          </button>
        </div>
      </div>

      {/* Render content based on active tab */}
      {activeTab === 'daily-sales' ? (
        <DailySalesTracker />
      ) : activeTab === 'dashboard' ? (
        <DataAllocationDashboard />
      ) : activeTab === 'categorizer' ? (
        <DataCategorizerDashboard />
      ) : activeTab === 'user-packages' ? (
        <UserPackageBreakdown />
      ) : (
        <Card>
        <CardHeader className="bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">User Billing</CardTitle>
              <CardDescription>
                Generate bills for specific users on a particular date
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* User Selection */}
            <div>
              <label className="text-sm sm:text-base font-medium mb-2 block text-gray-700">Select User</label>
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

            {/* Date Selection - Simple Input */}
            <div>
              <label className="text-sm sm:text-base font-medium mb-2 block text-gray-700">Select Date</label>
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
                <input 
                  type="date"
                  value={selectedDate}
                  max={getTodayUTC()}
                  onChange={(e) => {
                    // Always interpret as UTC
                    const val = e.target.value;
                    setSelectedDate(val);
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="ml-2 text-xs sm:text-sm text-gray-700">(UTC)</span>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button 
                onClick={fetchBillData} 
                disabled={loading || !selectedUserId || !selectedDate}
                className="w-full"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  'Generate Bill'
                )}
              </Button>
            </div>
          </div>
          
          {/* Bill Data Display */}
          {billData && billData.orders && billData.orders.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">
                  Bill for {billData.userName} - {selectedDate}
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportBillAsCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-xl font-bold">{billData.orders.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Data</p>
                  <p className="text-xl font-bold">
                    {billData.totalData > 1024 
                      ? `${(billData.totalData / 1024).toFixed(2)} TB` 
                      : `${billData.totalData.toFixed(2)} GB`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-green-700">
                    GHS {billData.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Order ID</th>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-left">Data (GB)</th>
                      <th className="px-4 py-3 text-left">Entries</th>
                      <th className="px-4 py-3 text-right">Amount (GHS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billData.orders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-200">
                        <td className="px-4 py-3 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                        <td className="px-4 py-3">{order.time}</td>
                        <td className="px-4 py-3">{order.totalData.toFixed(2)}</td>
                        <td className="px-4 py-3">{order.totalCount}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {order.estimatedCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-3" colSpan={2}>Total</td>
                      <td className="px-4 py-3">{billData.totalData.toFixed(2)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right">{billData.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {billData && (!billData.orders || billData.orders.length === 0) && (
            <div className="mt-8 text-center p-8 border rounded-lg bg-gray-50">
              <p className="text-gray-700">No orders found for this user on the selected date.</p>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
