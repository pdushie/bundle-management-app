'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface AdminOrder {
  id: string;
  type: 'order' | 'bundle-allocator';
  timestamp: number;
  date: string;
  time: string;
  userName?: string;
  userEmail?: string;
  totalData: number;
  totalCount: number;
  status?: string;
  cost?: number;
  estimatedCost?: number;
  processedBy?: string;
  processedAt?: string;
  adminEmail?: string;
  adminName?: string;
  entries?: any[];
}

interface Filters {
  adminId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
}

export default function AdminOrdersDashboard() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: 25
  });
  const [filters, setFilters] = useState<Filters>({
    adminId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  // Fetch available admins
  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/admins');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchOrders = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
      
      // Add pagination parameters
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', '25');

      const response = await fetch(`/api/admin/processing-reports?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.reports || []);
        setPaginationMeta(data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalRecords: data.reports?.length || 0,
          pageSize: 25
        });
        setCurrentPage(page);
      } else {
        console.error('Failed to fetch processing reports');
      }
    } catch (error) {
      console.error('Error fetching processing reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/admin/processing-reports?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const reports = data.reports || [];
        
        // Create CSV content with processing type
        const headers = ['ID', 'Type', 'Date', 'Time', 'User Name', 'User Email', 'Status', 'Total Data (GB)', 'Total Count', 'Cost', 'Processed By', 'Admin Name', 'Admin Email', 'Processed At'];
        const csvContent = [
          headers.join(','),
          ...reports.map((report: AdminOrder) => [
            report.id,
            report.type === 'order' ? 'Order' : 'Bundle Allocator',
            report.date,
            report.time,
            report.userName || '',
            report.userEmail || '',
            report.status || 'processed',
            report.totalData.toFixed(2),
            report.totalCount,
            report.type === 'order' ? (
              report.cost ? `GHS ${report.cost.toFixed(2)}` : 
              report.estimatedCost ? `~GHS ${report.estimatedCost.toFixed(2)}` : ''
            ) : 'N/A',
            report.processedBy || '',
            report.adminName || '',
            report.adminEmail || '',
            report.processedAt || ''
          ].map(field => `"${field}"`).join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `admin-processing-reports-${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Error exporting processing reports:', error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAdmins();
      fetchOrders();
    }
  }, [session]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  const clearFilters = () => {
    setFilters({
      adminId: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
    // Fetch with cleared filters
    setTimeout(() => {
      fetchOrders(1);
    }, 100);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationMeta.totalPages) {
      fetchOrders(page);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!session) {
    return <div className="p-4">Please log in to access admin dashboard.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Processing Dashboard</h1>
      
      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin
            </label>
            <select
              value={filters.adminId}
              onChange={(e) => handleFilterChange('adminId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Admins</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Filters
          </button>
          <button
            onClick={exportToCsv}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Processing Reports ({orders.length} results)
          </h2>
          
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No processing reports found with current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Date/Time</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">User</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Data/Count</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Cost</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Processed By</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Processed At</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                        {order.id.substring(0, 8)}...
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.type === 'order' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {order.type === 'order' ? 'Order' : 'Bundle Allocator'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="text-sm">
                          <div>{order.date}</div>
                          <div className="text-gray-500">{order.time}</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {order.userName && order.userEmail ? (
                          <div className="text-sm">
                            <div className="font-medium">{order.userName}</div>
                            <div className="text-gray-500">{order.userEmail}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">System</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'processed' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="text-sm">
                          <div>{order.totalData.toFixed(2)} GB</div>
                          <div className="text-gray-500">{order.totalCount.toLocaleString()} items</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="text-sm font-medium">
                          {order.type === 'order' ? (
                            order.cost ? `GHS ${order.cost.toFixed(2)}` : 
                            order.estimatedCost ? `~GHS ${order.estimatedCost.toFixed(2)}` : 
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {order.adminEmail ? (
                          <div className="text-sm">
                            <div className="font-medium">{order.adminName || 'Unknown'}</div>
                            <div className="text-gray-500">{order.adminEmail}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not processed</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {order.processedAt ? (
                          <div className="text-sm text-gray-600">
                            {formatDate(new Date(order.processedAt).getTime())}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {paginationMeta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {paginationMeta.currentPage} of {paginationMeta.totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={paginationMeta.currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(paginationMeta.currentPage - 1)}
                disabled={paginationMeta.currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, paginationMeta.totalPages) }, (_, i) => {
                  let pageNum;
                  if (paginationMeta.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (paginationMeta.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (paginationMeta.currentPage >= paginationMeta.totalPages - 2) {
                    pageNum = paginationMeta.totalPages - 4 + i;
                  } else {
                    pageNum = paginationMeta.currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        pageNum === paginationMeta.currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(paginationMeta.currentPage + 1)}
                disabled={paginationMeta.currentPage === paginationMeta.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(paginationMeta.totalPages)}
                disabled={paginationMeta.currentPage === paginationMeta.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}