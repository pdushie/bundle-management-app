"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft, ArrowRight, FileText, User, Package, CheckCircle, Clock, AlertCircle, Eye, X, Search } from 'lucide-react';
import { getUserBilling, getUserBillingRange, getMonthlyBilling } from '../lib/billingClient';
import { getCurrentTimeSync, getCurrentDateStringSync } from '../lib/timeService';
import { getFormattedDate } from '../lib/dateUtils';

export default function BillingApp() {
  // Initialize with local time to avoid timezone display issues
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [billingData, setBillingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for order details
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [entriesSearchText, setEntriesSearchText] = useState<string>('');
  const [entriesCurrentPage, setEntriesCurrentPage] = useState<number>(1);
  const [entriesPerPage] = useState<number>(20);

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', { 
      style: 'currency', 
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
  };

  // Helper function to format date for HTML input (avoids timezone issues)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get billing data for the selected date
  useEffect(() => {
    async function fetchBillingData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Format the date as YYYY-MM-DD for the API using local time
        const dateString = formatDateForInput(selectedDate);
        const data = await getUserBilling(dateString);
        console.log("Billing data received:", data);
        console.log("Total amount:", data.totalAmount);
        
        // Debug order costs
        if (data && data.orders) {
          console.log("Orders with costs:");
          data.orders.forEach((order: any) => {
            console.log(`- ${order.id}: estimatedCost=${order.estimatedCost}, status=${order.status}`);
          });
          
          // Calculate total ourselves to verify
          const calculatedTotal = data.orders.reduce((total: number, order: any) => {
            return total + (Number(order.estimatedCost) || 0);
          }, 0);
          
          console.log(`API reports totalAmount: ${data.totalAmount}, Calculated: ${calculatedTotal}`);
          
          // If there's a significant difference, use our calculation
          if (Math.abs(data.totalAmount - calculatedTotal) > 0.01) {
            console.log(`Fixing total amount from ${data.totalAmount} to ${calculatedTotal}`);
            data.totalAmount = calculatedTotal;
          }
        }
        
        setBillingData(data);
      } catch (err: any) {
        console.error('Error fetching billing data:', err);
        setError(err.message || 'Failed to load billing information');
        setBillingData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBillingData();
  }, [selectedDate]);

  // Navigation functions
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goToPreviousDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Don't allow selecting dates in the future
    if (selectedDate.getTime() < new Date().setHours(23, 59, 59, 999)) {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setDate(prevDate.getDate() + 1);
        return newDate;
      });
    }
  };

  const goToPreviousMonth = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Don't allow selecting dates in the future
    if (selectedDate < nextMonth) {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setMonth(prevDate.getMonth() + 1);
        return newDate;
      });
    }
  };

  // Function to handle date picker change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateValue = e.target.value;
    const today = formatDateForInput(new Date());
    
    // Don't allow selecting dates in the future
    if (selectedDateValue > today) {
      return;
    }
    
    // Parse the date string as local time to avoid timezone shift
    // selectedDateValue format is "YYYY-MM-DD"
    const [year, month, day] = selectedDateValue.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    
    setSelectedDate(localDate);
  };

  // Check if selected date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Check if the selected date is in the future
  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
  };

  // Modal functions
  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setModalVisible(true);
    setEntriesSearchText('');
    setEntriesCurrentPage(1);
  };

  const closeOrderDetails = () => {
    setModalVisible(false);
    setSelectedOrder(null);
    setEntriesSearchText('');
    setEntriesCurrentPage(1);
  };

  // Handle keyboard events (Escape to close modal)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalVisible) {
        closeOrderDetails();
      }
    };

    if (modalVisible) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [modalVisible]);

  // Filter entries based on search text
  const getFilteredEntries = () => {
    if (!selectedOrder) return [];
    
    const entries = selectedOrder.entries || [];
    if (!entriesSearchText) return entries;
    
    const searchTerm = entriesSearchText.toLowerCase();
    return entries.filter((entry: any) => 
      entry.number.toLowerCase().includes(searchTerm) ||
      entry.allocationGB.toString().includes(searchTerm) ||
      (entry.status?.toLowerCase() || '').includes(searchTerm)
    );
  };

  // Get paginated entries
  const getPaginatedEntries = () => {
    const filteredEntries = getFilteredEntries();
    const startIndex = (entriesCurrentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    return filteredEntries.slice(startIndex, endIndex);
  };

  // Handle entries page navigation
  const handleEntriesPageChange = (pageNumber: number) => {
    setEntriesCurrentPage(pageNumber);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-blue-600" />
            Billing History
          </h1>
          <p className="text-gray-900 mt-2">
            View your billing details and history
          </p>
        </div>

        {/* Date Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPreviousMonth} 
                className="p-2 rounded-md hover:bg-gray-100"
                title="Previous Month"
              >
                <ChevronsLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button 
                onClick={goToPreviousDay} 
                className="p-2 rounded-md hover:bg-gray-100"
                title="Previous Day"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              
              <div className="relative">
                <input 
                  type="date" 
                  value={formatDateForInput(selectedDate)} 
                  onChange={handleDateChange}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 bg-white"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-700" />
              </div>
              
              <button 
                onClick={goToNextDay} 
                disabled={isFutureDate(selectedDate)}
                className={`p-2 rounded-md ${!isFutureDate(selectedDate) ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                title={isFutureDate(selectedDate) ? "Cannot select future date" : "Next Day"}
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
              <button 
                onClick={goToNextMonth} 
                disabled={isFutureDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()))}
                className={`p-2 rounded-md ${!isFutureDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate())) ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                title={isFutureDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate())) ? "Cannot select future date" : "Next Month"}
              >
                <ChevronsRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={goToToday}
                disabled={isToday(selectedDate)}
                className={`px-4 py-2 ${!isToday(selectedDate) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 cursor-not-allowed'} rounded-md font-medium transition-colors`}
              >
                Today
              </button>
              
              {billingData && (
                <>
                  <button 
                    onClick={() => {
                      const dateString = formatDateForInput(selectedDate);
                      window.location.href = `/api/billing/export?date=${dateString}`;
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors text-gray-900"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const dateString = formatDateForInput(selectedDate);
                        const response = await fetch(`/api/billing/pdf?date=${dateString}`);
                        
                        if (!response.ok) {
                          throw new Error('Failed to generate PDF');
                        }
                        
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Billing_${dateString}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        alert('Failed to download PDF. Please try again.');
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors text-gray-900"
                    style={{ marginLeft: '8px' }}
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Billing Summary Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <DollarSign className="w-6 h-6 text-green-600" />
            Billing Summary for {getFormattedDate(selectedDate)}
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          ) : !billingData || (billingData.orders.length === 0) ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
              No billing data found for this date.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-900 mb-1">Total Orders</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{billingData.orders.length}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-900 mb-1">Processed Orders</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{billingData.orders.filter((order: any) => order.status === 'processed').length}</p>
                  <p className="text-xs text-gray-700 mt-1">Billable orders</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-900 mb-1">Pending Orders</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{billingData.orders.filter((order: any) => order.status === 'pending').length}</p>
                  <p className="text-xs text-gray-700 mt-1">Not yet billable</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-900 mb-1">Billable Amount</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(billingData.totalAmount || 0)}</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Processed orders only
                  </p>
                </div>
              </div>

              {/* Orders Table */}
              <h3 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Orders</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Time</th>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Order ID</th>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Entries</th>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Total Data</th>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Pricing Profile</th>
                      <th scope="col" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-900 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingData.orders.map((order: any) => (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${order.status === 'processed' ? 'bg-green-50' : order.status === 'pending' ? 'bg-yellow-50' : ''}`}
                        onClick={() => openOrderDetails(order)}
                        title="Click to view order entries and costs"
                      >
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{order.time}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                            <span className="text-xs sm:text-sm">{order.id}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                          <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'processed' 
                              ? 'bg-green-100 text-green-800' 
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === 'processed' && <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                            {order.status === 'pending' && <Clock className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                            {order.status !== 'processed' && order.status !== 'pending' && <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                            <span className="text-xs">{order.status || 'Unknown'}</span>
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{order.totalCount}</td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {order.totalData > 1024 
                            ? `${(order.totalData / 1024).toFixed(2)} TB` 
                            : `${order.totalData.toFixed(2)} GB`}
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {order.pricingProfileName || "Default"}
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <span className={order.status === 'processed' ? 'text-green-600' : 'text-gray-900'}>
                            {formatCurrency(order.estimatedCost || 0)}
                          </span>
                          {order.status === "pending" && <span className="text-xs text-yellow-600 block">Not billable yet</span>}
                          {order.status === "processed" && <span className="text-xs text-green-600 block">Billable</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Order Details Modal */}
      {modalVisible && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 sm:p-4 lg:p-6 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Order Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                    <div><span className="font-medium">Order ID:</span> <span className="break-all">{selectedOrder.id}</span></div>
                    <div><span className="font-medium">Date:</span> <span className="break-words">{getFormattedDate(selectedDate)} at {selectedOrder.time}</span></div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-1 sm:ml-2 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrder.status === 'processed' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedOrder.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedOrder.status === 'processed' && <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                        {selectedOrder.status === 'pending' && <Clock className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                        {selectedOrder.status !== 'processed' && selectedOrder.status !== 'pending' && <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                        {selectedOrder.status || 'Unknown'}
                      </span>
                    </div>
                    <div><span className="font-medium">Total Data:</span> {selectedOrder.totalData > 1024 
                      ? `${(selectedOrder.totalData / 1024).toFixed(2)} TB` 
                      : `${selectedOrder.totalData.toFixed(2)} GB`}
                    </div>
                    <div><span className="font-medium">Pricing Profile:</span> <span className="break-words">{selectedOrder.pricingProfileName || "Default"}</span></div>
                    <div><span className="font-medium">Total Cost:</span> {formatCurrency(selectedOrder.estimatedCost || 0)}</div>
                  </div>
                </div>
                <button
                  onClick={closeOrderDetails}
                  className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-4 lg:p-6">
              {/* Search Bar */}
              <div className="mb-3 sm:mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search entries..."
                    className="w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={entriesSearchText}
                    onChange={(e) => {
                      setEntriesSearchText(e.target.value);
                      setEntriesCurrentPage(1); // Reset to first page on search
                    }}
                  />
                  <Search className="absolute left-2 sm:left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-900" />
                </div>
              </div>

              {/* Entries Table */}
              <div className="overflow-x-auto max-h-[40vh] sm:max-h-[50vh] border rounded-lg">
                <table className="w-full min-w-[400px] sm:min-w-[600px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">#</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Phone</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Data</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getPaginatedEntries().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 sm:px-4 py-6 sm:py-8 text-center text-gray-900 text-xs sm:text-sm">
                          {entriesSearchText ? 'No entries match your search' : 'No entries found'}
                        </td>
                      </tr>
                    ) : (
                      getPaginatedEntries().map((entry: any, index: number) => (
                        <tr key={`${entry.number}-${index}`} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {(entriesCurrentPage - 1) * entriesPerPage + index + 1}
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 break-all">{entry.number}</td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            <span className="bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium">
                              {entry.allocationGB} GB
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${
                              entry.status === 'sent' ? 'bg-green-100 text-green-800' :
                              entry.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {entry.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {entry.cost ? `GHS ${Number(entry.cost).toFixed(2)}` : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Entries Pagination */}
              {getFilteredEntries().length > entriesPerPage && (
                <div className="flex justify-center items-center py-4 mt-4 border-t">
                  <nav className="flex items-center">
                    <button
                      onClick={() => handleEntriesPageChange(entriesCurrentPage - 1)}
                      disabled={entriesCurrentPage === 1}
                      className={`px-3 py-1 rounded border ${entriesCurrentPage === 1 ? 'text-gray-500 border-gray-300' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="px-4 text-sm text-gray-700">
                      Page {entriesCurrentPage} of {Math.ceil(getFilteredEntries().length / entriesPerPage)}
                      <span className="ml-2 text-xs text-gray-700">
                        ({getFilteredEntries().length} entries)
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleEntriesPageChange(entriesCurrentPage + 1)}
                      disabled={entriesCurrentPage === Math.ceil(getFilteredEntries().length / entriesPerPage)}
                      className={`px-3 py-1 rounded border ${entriesCurrentPage === Math.ceil(getFilteredEntries().length / entriesPerPage) ? 'text-gray-500 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
