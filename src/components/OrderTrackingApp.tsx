"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar, Phone, Database, Loader, Filter, ArrowUpDown, Check, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";

// Helper function for consistent date formatting across server and client
function formatDate(date: Date): string {
  // Format as YYYY-MM-DD HH:MM:SS - this is consistent across environments
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Define types for order tracking
type OrderEntry = {
  id: number | string;
  orderId: string;
  number: string;
  allocationGB: string;
  status: string;
  createdAt: string;
  source?: 'order_entries' | 'phone_entries';
  originalEntry?: any;
};

// Main component for order tracking
export default function OrderTrackingApp() {
  const { data: session } = useSession();
  const [orderEntries, setOrderEntries] = useState<OrderEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<OrderEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [entriesPerPage] = useState<number>(50);
  
  // Sorting states
  const [sortField, setSortField] = useState<keyof OrderEntry>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch order entries when component mounts, but only on the client side
  useEffect(() => {
    // Ensure this only runs on the client side
    if (typeof window !== 'undefined') {
      fetchOrderEntries();
    }
  }, []);
  
  // Function to fetch order entries with or without filters
  const fetchOrderEntries = async (filters?: { phoneNumber?: string, startDate?: string, endDate?: string, status?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      
      if (filters) {
        // Use the filter API endpoint with POST
        console.log("Fetching with filters:", JSON.stringify(filters));
        response = await fetch("/api/orders/track/filter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(filters),
        });
      } else {
        // Use the basic endpoint with GET
        console.log("Fetching all entries without filters");
        response = await fetch("/api/orders/track", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Failed to fetch order entries: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Received ${data.orderEntries?.length || 0} entries from API`);
      setOrderEntries(data.orderEntries || []);
    } catch (err) {
      console.error("Error fetching order entries:", err);
      setError(`Failed to load order entries: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
    }
  };

  // Handle applying filters
  const handleApplyFilters = () => {
    setIsFiltering(true);
    
    // Create filter object
    const filters: { phoneNumber?: string; startDate?: string; endDate?: string; status?: string } = {};
    
    if (searchTerm) {
      filters.phoneNumber = searchTerm;
    }
    
    if (startDate) {
      filters.startDate = startDate;
      console.log(`Applying start date filter: ${startDate}`);
    }
    
    if (endDate) {
      filters.endDate = endDate;
      console.log(`Applying end date filter: ${endDate}`);
    }
    
    if (statusFilter && statusFilter !== "all") {
      filters.status = statusFilter;
    }
    
    // Check if we have any filters
    if (Object.keys(filters).length > 0) {
      console.log("Applying filters:", JSON.stringify(filters));
      fetchOrderEntries(filters);
    } else {
      console.log("No filters applied, fetching all entries");
      fetchOrderEntries();
    }
  };
  
  // Handle clearing filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
    fetchOrderEntries();
  };

  // Apply sorting when orderEntries changes
  useEffect(() => {
    // Only run this on the client side to prevent hydration issues
    if (typeof window !== 'undefined') {
      // Apply sorting only - we handle filtering on the server
      const sorted = [...orderEntries].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === "createdAt") {
          aValue = new Date(aValue as string).getTime().toString();
          bValue = new Date(bValue as string).getTime().toString();
        }
        
        if (aValue < bValue) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      });
      
      setFilteredEntries(sorted);
      // Reset to first page when data changes
      setCurrentPage(1);
    }
  }, [orderEntries, sortField, sortDirection]);

  // Get current entries for pagination - ensure this is calculated consistently between server and client
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  // Initialize with a safe default value
  const [currentEntries, setCurrentEntries] = useState<OrderEntry[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  
  // Use effect to calculate pagination values only on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentEntries(filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry));
      setTotalPages(Math.ceil(filteredEntries.length / entriesPerPage));
    }
  }, [filteredEntries, indexOfFirstEntry, indexOfLastEntry, entriesPerPage]);

  // Function to toggle sorting
  const handleSort = (field: keyof OrderEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Function to get status badge style
  const getStatusBadge = (status: string, source?: string) => {
    const badgeText = source === 'phone_entries' ? (status + ' (History)') : status;
    
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <Clock className="w-3 h-3 mr-1" />
            {badgeText}
          </span>
        );
      case "sent":
        return (
          <span className="flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            <CheckCircle className="w-3 h-3 mr-1" />
            {badgeText}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {badgeText}
          </span>
        );
      default:
        return (
          <span className="flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
            {badgeText}
          </span>
        );
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <Loader className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading order data...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh] text-center">
        <AlertTriangle className="w-8 h-8 text-red-600 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 pb-8 sm:pb-12 bg-white rounded-lg shadow-md">
      {/* Header and Filters */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Track Order Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filter Options</h3>
          </div>
          
          {/* Search Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-600" />
            </div>
            <input
              type="text"
              placeholder="Search phone number..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900 bg-white placeholder:text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-600" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          {/* Date Range Filter */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <input
                type="date"
                placeholder="Start Date"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={startDate}
                onChange={(e) => {
                  console.log("Setting start date:", e.target.value);
                  setStartDate(e.target.value);
                }}
                max={endDate || undefined}
              />
              <span className="block text-xs text-gray-700 mt-1">Start Date</span>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <input
                type="date"
                placeholder="End Date"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={endDate}
                onChange={(e) => {
                  console.log("Setting end date:", e.target.value);
                  setEndDate(e.target.value);
                }}
                min={startDate || undefined}
              />
              <span className="block text-xs text-gray-700 mt-1">End Date</span>
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="md:col-span-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <Database className="w-4 h-4 inline mr-2" />
              <span>
                {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"} found
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleClearFilters}
                disabled={isFiltering}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
              <button
                onClick={handleApplyFilters}
                disabled={isFiltering}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isFiltering ? (
                  <>
                    <Loader className="w-4 h-4 inline animate-spin mr-2" />
                    Filtering...
                  </>
                ) : (
                  'Apply Filters'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center">
                  <span>Date & Time</span>
                  <ArrowUpDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("number")}
              >
                <div className="flex items-center">
                  <span>Phone Number</span>
                  <ArrowUpDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("allocationGB")}
              >
                <div className="flex items-center">
                  <span>Data Allocation</span>
                  <ArrowUpDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  <span>Status</span>
                  <ArrowUpDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
              >
                Order ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentEntries.length > 0 ? (
              currentEntries.map((entry) => (
                <tr key={typeof entry.id === 'number' ? entry.id : String(entry.id)} 
                    className={`hover:bg-gray-50 ${entry.source === 'phone_entries' ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(new Date(entry.createdAt))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-blue-500" />
                      {entry.number}
                      {entry.source === 'phone_entries' && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                          History
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {Number(entry.allocationGB) >= 1
                      ? `${Number(entry.allocationGB).toFixed(2)} GB`
                      : `${(Number(entry.allocationGB) * 1024).toFixed(0)} MB`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(entry.status, entry.source)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {entry.source === 'phone_entries' 
                      ? `History: ${entry.orderId}`
                      : entry.orderId}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-700">
                  No order entries match your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredEntries.length > entriesPerPage && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 relative z-10">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstEntry + 1}</span> to{" "}
            <span className="font-medium">
              {indexOfLastEntry > filteredEntries.length 
                ? filteredEntries.length 
                : indexOfLastEntry}
            </span>{" "}
            of <span className="font-medium">{filteredEntries.length}</span> results
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border border-gray-300`}
            >
              Previous
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
              // Show pages around current page
              let pageNum;
              if (totalPages <= 5) {
                pageNum = idx + 1;
              } else if (currentPage <= 3) {
                pageNum = idx + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + idx;
              } else {
                pageNum = currentPage - 2 + idx;
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } border border-gray-300`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } border border-gray-300`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
