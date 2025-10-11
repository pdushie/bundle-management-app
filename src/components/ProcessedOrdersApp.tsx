"use client";

import React, { useState, useEffect } from 'react';
import { getProcessedOrdersOldestFirst, Order } from '@/lib/orderClient';
import { useOrderCount } from '@/lib/orderContext';
import { ORDER_UPDATED_EVENT, ORDER_PROCESSED_EVENT, notifyCountUpdated } from '@/lib/orderNotifications';
import { ChevronLeft, ChevronRight, X, Search, Eye } from 'lucide-react';

export default function ProcessedOrdersApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'date' | 'userName'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(25);
  const [filterText, setFilterText] = useState<string>('');
  const { refreshOrderCount } = useOrderCount();
  
  // Modal state for order details
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [entriesSearchText, setEntriesSearchText] = useState<string>('');
  const [entriesCurrentPage, setEntriesCurrentPage] = useState<number>(1);
  const [entriesPerPage] = useState<number>(20);

  const fetchProcessedOrders = async () => {
    try {
      setLoading(true);
      const processedOrders = await getProcessedOrdersOldestFirst();
      setOrders(processedOrders);
      refreshOrderCount();
    } catch (error) {
      console.error("Failed to fetch processed orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Set up polling for real-time updates
  useEffect(() => {
    console.log('ProcessedOrdersApp: Setting up event listeners');
    
    // Fetch orders immediately
    fetchProcessedOrders();
    
    // Set up event listener for order updates
    const handleOrderUpdate = () => {
      console.log('ProcessedOrdersApp: ORDER_UPDATED_EVENT received');
      fetchProcessedOrders();
    };
    
    // Set up a more specific event listener for processed orders
    const handleOrderProcessed = () => {
      console.log('ProcessedOrdersApp: ORDER_PROCESSED_EVENT received');
      fetchProcessedOrders();
      // Force a count update notification
      notifyCountUpdated();
    };
    
    // Add event listeners
    window.addEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    window.addEventListener(ORDER_PROCESSED_EVENT, handleOrderProcessed);
    
    // Set up polling interval with a much longer interval (2 minutes)
    // This reduces bandwidth usage and compute hours while still keeping data reasonably fresh
    const intervalId = setInterval(() => {
      console.log('ProcessedOrdersApp: Low-frequency polling triggered');
      fetchProcessedOrders();
    }, 120000); // 2 minutes
    
    // Clean up
    return () => {
      window.removeEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
      window.removeEventListener(ORDER_PROCESSED_EVENT, handleOrderProcessed);
      clearInterval(intervalId);
    };
  }, []);

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

  const toggleSort = (field: 'date' | 'userName') => {
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
      (order.userName?.toLowerCase() || '').includes(searchTerm) ||
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
        ? (a.userName || '').localeCompare(b.userName || '')
        : (b.userName || '').localeCompare(a.userName || '');
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

  // Modal functions
  const openOrderDetails = (order: Order) => {
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

  // Filter entries based on search text
  const getFilteredEntries = () => {
    if (!selectedOrder) return [];
    
    const entries = selectedOrder.entries || [];
    if (!entriesSearchText) return entries;
    
    const searchTerm = entriesSearchText.toLowerCase();
    return entries.filter(entry => 
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
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Processed Orders</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-700 mt-1">
                  View all orders that have been processed
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter orders..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value);
                      setCurrentPage(1); // Reset to first page on filter change
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-700">
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
              <p className="ml-3 text-gray-700">Loading processed orders...</p>
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Processed Orders</h3>
              <p className="text-gray-700 max-w-md mx-auto">
                There are no processed orders to display. Orders will appear here after they are processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                    <th 
                      className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-blue-600"
                      onClick={() => toggleSort('userName')}
                    >
                      <div className="flex items-center">
                        <span>User</span>
                        {sortField === 'userName' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-blue-600"
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
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Data</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPageOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => openOrderDetails(order)}
                      title="Click to view order entries"
                    >
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-500" />
                          {order.id}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">{order.userName}</td>
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
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Processed
                          </span>
                          <span className="text-xs text-gray-700">
                            ({order.totalCount} entries)
                          </span>
                        </div>
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
                      className={`px-2 py-1 rounded border ${currentPage === 1 ? 'text-gray-500 border-gray-300' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="px-4 text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                      {filterText && (
                        <span className="ml-2 text-xs text-gray-700">
                          (Showing {filteredOrders.length} of {orders.length} orders)
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-2 py-1 rounded border ${currentPage === totalPages ? 'text-gray-500 border-gray-200' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
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
          <div className="text-center mt-4 text-sm text-gray-700">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedOrders.length)} of {sortedOrders.length} orders
          </div>
        )}
      </div>
      
      {/* Order Details Modal */}
      {modalVisible && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">Order Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Order ID:</span> {selectedOrder.id}</div>
                    <div><span className="font-medium">User:</span> {selectedOrder.userName}</div>
                    <div><span className="font-medium">Date:</span> {new Date(selectedOrder.timestamp).toLocaleString()}</div>
                    <div><span className="font-medium">Total Data:</span> {selectedOrder.totalData > 1023 
                      ? `${(selectedOrder.totalData / 1024).toFixed(2)} TB` 
                      : `${selectedOrder.totalData} GB`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeOrderDetails}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search entries by phone number, allocation, or status..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    value={entriesSearchText}
                    onChange={(e) => {
                      setEntriesSearchText(e.target.value);
                      setEntriesCurrentPage(1); // Reset to first page on search
                    }}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-900" />
                </div>
              </div>

              {/* Entries Table */}
              <div className="overflow-x-auto max-h-[50vh] border rounded-lg">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Phone Number</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Data Allocation</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getPaginatedEntries().length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-900">
                          {entriesSearchText ? 'No entries match your search' : 'No entries found'}
                        </td>
                      </tr>
                    ) : (
                      getPaginatedEntries().map((entry, index) => (
                        <tr key={`${entry.number}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {(entriesCurrentPage - 1) * entriesPerPage + index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {entry.allocationGB} GB
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              entry.status === 'sent' ? 'bg-green-100 text-green-800' :
                              entry.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {entry.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {entry.cost ? `GHS ${entry.cost.toFixed(2)}` : 'N/A'}
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
                      className={`px-3 py-1 rounded border ${entriesCurrentPage === 1 ? 'text-gray-500 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
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
