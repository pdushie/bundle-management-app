"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getUserBilling } from '../lib/billingClient';
import { getFormattedDate } from '../lib/dateUtils';

export default function BillingApp() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [billingData, setBillingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', { 
      style: 'currency', 
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
  };

  // Get billing data for the selected date
  useEffect(() => {
    async function fetchBillingData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Format the date as YYYY-MM-DD for the API
        const dateString = selectedDate.toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
    
    // Don't allow selecting dates in the future
    if (selectedDateValue > today) {
      return;
    }
    
    setSelectedDate(new Date(selectedDateValue));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-blue-600" />
            Billing History
          </h1>
          <p className="text-gray-600 mt-2">
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
                <ChevronsLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={goToPreviousDay} 
                className="p-2 rounded-md hover:bg-gray-100"
                title="Previous Day"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="relative">
                <input 
                  type="date" 
                  value={selectedDate.toISOString().split('T')[0]} 
                  onChange={handleDateChange}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
              
              <button 
                onClick={goToNextDay} 
                disabled={isFutureDate(selectedDate)}
                className={`p-2 rounded-md ${!isFutureDate(selectedDate) ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                title={isFutureDate(selectedDate) ? "Cannot select future date" : "Next Day"}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={goToNextMonth} 
                disabled={isFutureDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()))}
                className={`p-2 rounded-md ${!isFutureDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate())) ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                title={isFutureDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate())) ? "Cannot select future date" : "Next Month"}
              >
                <ChevronsRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={goToToday}
                disabled={isToday(selectedDate)}
                className={`px-4 py-2 ${!isToday(selectedDate) ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-md font-medium transition-colors`}
              >
                Today
              </button>
              
              {billingData && (
                <>
                  <button 
                    onClick={() => {
                      const dateString = selectedDate.toISOString().split('T')[0];
                      window.location.href = `/api/billing/export?date=${dateString}`;
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      const dateString = selectedDate.toISOString().split('T')[0];
                      window.location.href = `/api/billing/pdf?date=${dateString}`;
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
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
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold">{billingData.orders.length}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-1">Total Data</p>
                  <p className="text-2xl font-bold">
                    {billingData.totalData > 1024 
                      ? `${(billingData.totalData / 1024).toFixed(2)} TB` 
                      : `${billingData.totalData.toFixed(2)} GB`}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <p className="text-sm text-purple-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(billingData.totalAmount || 0)}</p>
                  <p className="text-xs text-purple-500 mt-1">
                    {billingData.orders.some((order: any) => order.status === "pending") ? 
                      "* Includes pending orders" : ""}
                  </p>
                </div>
              </div>

              {/* Orders Table */}
              <h3 className="font-medium text-gray-700 mb-3">Orders</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Data</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Profile</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingData.orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.totalCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.totalData > 1024 
                            ? `${(order.totalData / 1024).toFixed(2)} TB` 
                            : `${order.totalData.toFixed(2)} GB`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.pricingProfileName || "Default"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(order.estimatedCost || 0)}
                          {order.status === "pending" && " (Pending)"}
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
    </div>
  );
}
