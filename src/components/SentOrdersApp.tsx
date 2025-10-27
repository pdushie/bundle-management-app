"use client";

import React, { useState, useEffect } from 'react';
import { getUserOrdersOldestFirst, Order } from '@/lib/orderClient';
import { useOrderCount } from '@/lib/orderContext';
import { ORDER_UPDATED_EVENT, ORDER_SENT_EVENT, notifyCountUpdated } from '@/lib/orderNotifications';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, X, DollarSign, Phone, Database } from 'lucide-react';

export default function SentOrdersApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'date' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(25);
  const [filterText, setFilterText] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { refreshOrderCount } = useOrderCount();
  const { data: session } = useSession();
  const userEmail = session?.user?.email || '';

  const fetchUserOrders = async () => {
    if (!userEmail) return;
    
    try {
      setLoading(true);
      const userOrders = await getUserOrdersOldestFirst(userEmail);
      
      // Log the orders to see if entry costs are present
      // // Console log removed for security
      
      setOrders(userOrders);
      refreshOrderCount();
    } catch (error) {
      // // Console statement removed for security
    } finally {
      setLoading(false);
    }
  };
  
  // Set up polling for real-time updates
  useEffect(() => {
    if (!userEmail) return;
    
    // // Console log removed for security
    
    // Fetch orders immediately
    fetchUserOrders();
    
    // Set up event listener for order updates
    const handleOrderUpdate = () => {
      // // Console log removed for security
      fetchUserOrders();
    };
    
    // Set up a more specific event listener for sent orders
    const handleOrderSent = () => {
      // // Console log removed for security
      fetchUserOrders();
      // Force a count update notification
      notifyCountUpdated();
    };
    
    // Add event listeners
    window.addEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    window.addEventListener(ORDER_SENT_EVENT, handleOrderSent);
    
    // Set up polling interval with a much longer interval (2 minutes)
    // This reduces bandwidth usage and compute hours while still keeping data reasonably fresh
    const intervalId = setInterval(() => {
      // Only poll if window is visible to further reduce API calls
      if (document.visibilityState === 'visible') {
        // // Console log removed for security
        fetchUserOrders();
      }
    }, 300000); // 5 minutes
    
    // Clean up
    return () => {
      window.removeEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
      window.removeEventListener(ORDER_SENT_EVENT, handleOrderSent);
      clearInterval(intervalId);
    };
  }, [userEmail]);

  const toggleSort = (field: 'date' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter orders based on search text
  const filteredOrders = orders.filter(order => {
    if (!filterText) return true;
    const searchTerm = filterText.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm) ||
      (order.pricingProfileName && order.pricingProfileName.toLowerCase().includes(searchTerm)) ||
  (order.estimatedCost !== null && order.estimatedCost !== undefined && order.estimatedCost.toString().includes(searchTerm)) ||
      new Date(order.timestamp).toLocaleDateString().includes(searchTerm)
    );
  });

  // Apply sorting to the filtered orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      return sortDirection === 'asc' 
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
  });
  
  // Calculate pagination indexes
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  // Get current page items
  const currentPageOrders = sortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  
  // Calculate total pages
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  
  // Handle page navigation
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            {/* On mobile, stack filter input above heading */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="order-2 sm:order-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <span>My Sent Orders</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-900 mt-1">
                  View all orders that you have sent
                </p>
              </div>
              <div className="order-1 sm:order-2 w-full sm:w-auto mb-2 sm:mb-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter orders..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value);
                      setCurrentPage(1); // Reset to first page on filter change
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="ml-3 text-gray-700">Loading your orders...</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-700 max-w-md mx-auto">
                You have not sent any orders yet. Create an order using the Send Order tab.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Order ID</th>
                    <th 
                      className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:text-blue-600"
                      onClick={() => toggleSort('date')}
                    >
                      <div className="flex items-center">
                        <span>Date</span>
                        {sortField === 'date' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Data</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Entries</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Cost</th>
                    <th 
                      className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:text-blue-600"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center">
                        <span>Status</span>
                        {sortField === 'status' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPageOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 font-medium">{order.id}</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-700">
                        {new Date(order.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                          {order.totalData > 1023 
                            ? `${(order.totalData / 1024).toFixed(2)} TB` 
                            : `${order.totalData} GB`
                          }
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {order.totalCount}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">
                        {order.estimatedCost !== undefined && order.estimatedCost !== null ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                            GHS {order.estimatedCost.toFixed(2)}
                          </span>
                        ) : order.pricingProfileName ? (
                          <span className="text-gray-700">{order.pricingProfileName}</span>
                        ) : (
                          <span className="text-gray-700">N/A</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === "processed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {order.status === "processed" ? "Processed" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {sortedOrders.length > 0 && (
                <div className="flex justify-center items-center py-4 border-t border-gray-200">
                  <nav className="flex items-center">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-2 py-1 rounded border ${currentPage === 1 ? 'text-gray-500 border-gray-300' : 'text-purple-600 border-purple-300 hover:bg-purple-50'}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="px-4 text-sm text-gray-900">
                      Page {currentPage} of {totalPages}
                      {filterText && (
                        <span className="ml-2 text-xs text-gray-900">
                          (Showing {filteredOrders.length} of {orders.length} orders)
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-2 py-1 rounded border ${currentPage === totalPages ? 'text-gray-500 border-gray-200' : 'text-purple-600 border-purple-300 hover:bg-purple-50'}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Page info */}
        {!loading && sortedOrders.length > 0 && (
          <div className="text-center mt-4 text-sm text-gray-900">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedOrders.length)} of {sortedOrders.length} orders
          </div>
        )}
      </div>
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xs sm:max-w-lg lg:max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Order Details</h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-900">Order ID</p>
                  <p className="font-medium text-sm sm:text-base text-gray-900">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-900">Date</p>
                  <p className="font-medium text-sm sm:text-base text-gray-900">{new Date(selectedOrder.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-900">Status</p>
                  <p className="font-medium">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedOrder.status === "processed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {selectedOrder.status === "processed" ? "Processed" : "Pending"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Pricing Information */}
            {selectedOrder.pricingProfileName && (
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <h3 className="font-medium text-sm sm:text-base text-gray-900">Pricing Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-900">Pricing Plan</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900">{selectedOrder.pricingProfileName}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-900">Total Data</p>
                    <p className="font-medium text-sm sm:text-base text-gray-900">
                      {selectedOrder.totalData > 1023 
                        ? `${(selectedOrder.totalData / 1024).toFixed(2)} TB` 
                        : `${selectedOrder.totalData} GB`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-900">Total Cost</p>
                    <p className="font-bold text-base sm:text-lg text-gray-900">
                      {selectedOrder.estimatedCost !== undefined && selectedOrder.estimatedCost !== null 
                        ? `GHS ${selectedOrder.estimatedCost.toFixed(2)}` 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-3 sm:p-4 overflow-auto flex-grow">
              <h3 className="font-medium mb-3 text-sm sm:text-base text-gray-900">Order Entries ({selectedOrder?.totalCount ?? 0})</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
                <div className="bg-gray-100 px-2 sm:px-4 py-2 grid grid-cols-3 rounded-md text-xs sm:text-sm font-medium text-gray-900">
                  <div>Phone</div>
                  <div>Data</div>
                  <div>Cost</div>
                </div>
                {selectedOrder?.entries?.map((entry, index) => (
                  <div key={index} className="border border-gray-200 px-2 sm:px-4 py-2 sm:py-3 grid grid-cols-3 gap-1 sm:gap-2 rounded-md hover:bg-gray-50">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-900 flex-shrink-0" />
                      <span className="text-xs sm:text-sm truncate text-gray-900">{entry.number}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Database className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-900">{entry.allocationGB} GB</span>
                    </div>
                    <div>
                      {entry.cost !== undefined && entry.cost !== null ? (
                        <span className="text-green-600 font-medium text-xs sm:text-sm">GHS {entry.cost.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-900 text-xs sm:text-sm">N/A</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 sm:p-4 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


