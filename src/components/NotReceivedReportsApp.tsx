"use client";

import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Upload, Eye, X, Search } from 'lucide-react';
import { useSSE } from '../hooks/useSSE';

interface NotReceivedReport {
  id: number;
  orderId: string;
  orderEntryId: number;
  number: string;
  allocationGb: string;
  reportDate: string;
  status: 'pending' | 'resolved' | 'confirmed_sent';
  adminNotes?: string;
  evidenceUrl?: string;
  resolutionDate?: string;
  orderDate?: string;
  orderTime?: string;
  processedAt?: string;
  orderStatus?: string;
  reportedByName?: string;
  reportedByEmail?: string;
  resolvedByName?: string;
}

export default function NotReceivedReportsApp() {
  const [reports, setReports] = useState<NotReceivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<NotReceivedReport | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/not-received-reports');
      const data = await response.json();
      
      if (response.ok) {
        setReports(data.reports);
      } else {
        console.error('Error fetching reports:', data.error);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Set up Server-Sent Events for real-time updates with production polling fallback
  const isProduction = process.env.NODE_ENV === 'production';
  const { connectionStatus } = useSSE('/api/admin/not-received-reports/events', {
    onMessage: (data) => {
      switch (data.type) {
        case 'connected':
          break;
          
        case 'new_report':
          // Refresh reports to get the latest data
          fetchReports();
          break;
          
        case 'report_resolved':
          // Refresh reports to get the latest data
          fetchReports();
          break;
          
        case 'heartbeat':
          // Keep connection alive
          break;
          
        default:
          break;
      }
    },
    fallbackInterval: isProduction ? 5000 : 60000, // 5 seconds in production, 60 seconds in development
    fallbackCallback: fetchReports
  });

  // Additional polling for production environments (Vercel compatibility)
  useEffect(() => {
    if (!isProduction) return;

    const pollInterval = setInterval(() => {
      fetchReports();
    }, 10000); // Poll every 10 seconds in production

    return () => clearInterval(pollInterval);
  }, [isProduction]);

  const handleResolve = async (reportId: number, status: 'resolved' | 'confirmed_sent') => {
    setResolving(reportId);
    
    try {
      let evidenceUrl = null;
      
      // Upload file first if there is one
      if (evidenceFile) {
        const formData = new FormData();
        formData.append('file', evidenceFile);
        
        const uploadResponse = await fetch('/api/evidence/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          evidenceUrl = uploadData.url;
        } else {
          console.error('File upload failed');
          alert('Failed to upload evidence file. Proceeding without file.');
        }
      }

      const response = await fetch(`/api/admin/not-received-reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          adminNotes: resolutionNotes || null,
          evidenceUrl: evidenceUrl
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh reports
        await fetchReports();
        setModalVisible(false);
        setSelectedReport(null);
        setResolutionNotes('');
        setEvidenceFile(null);
        alert(`Report ${status === 'resolved' ? 'resolved' : 'confirmed as sent'} successfully`);
      } else {
        alert(data.error || 'Failed to resolve report');
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to resolve report. Please try again.');
    } finally {
      setResolving(null);
    }
  };

  const openReportDetails = (report: NotReceivedReport) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const closeReportDetails = () => {
    setModalVisible(false);
    setSelectedReport(null);
    setResolutionNotes('');
    setEvidenceFile(null);
  };

  // Filter reports based on search and status
  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchText || 
      report.number.toLowerCase().includes(searchText.toLowerCase()) ||
      report.orderId.toLowerCase().includes(searchText.toLowerCase()) ||
      report.reportedByName?.toLowerCase().includes(searchText.toLowerCase()) ||
      report.reportedByEmail?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'confirmed_sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'resolved':
        return 'Resolved';
      case 'confirmed_sent':
        return 'Confirmed Sent';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ThumbsDown className="w-6 h-6 text-red-600" />
                  <span>Not Received Reports</span>
                </h2>
                <p className="text-sm text-gray-700 mt-1">
                  Manage user reports of numbers that didn't receive data allocation
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filteredReports.length}</span> reports
                {searchText && ` (filtered)`}
              </div>
            </div>
          </div>



          {/* Connection Status Indicator */}
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-bounce' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-gray-600">
                  Real-time updates: <span className={`font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' :
                    connectionStatus === 'connecting' ? 'text-yellow-600' :
                    connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     connectionStatus === 'error' ? 'Disconnected (using fallback)' : 'Closed'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by phone number, order ID, or user..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="confirmed_sent">Confirmed Sent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-3 text-gray-700">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <ThumbsDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Reports Found</h3>
                <p className="text-gray-600">
                  {searchText || statusFilter !== 'all' 
                    ? 'No reports match your search criteria' 
                    : 'No not received reports have been submitted yet'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Phone Number</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Data Allocation</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Order ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Reported By</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Report Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {report.number}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {report.allocationGb} GB
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-mono">
                          {report.orderId}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{report.reportedByName}</div>
                            <div className="text-gray-500 text-xs">{report.reportedByEmail}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {new Date(report.reportDate).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(report.status)}`}>
                            {getStatusText(report.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => openReportDetails(report)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Details Modal */}
      {modalVisible && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-600 text-white p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">Report Details</h3>
                  <div className="text-sm opacity-90">
                    Phone: {selectedReport.number} | Order: {selectedReport.orderId}
                  </div>
                </div>
                <button
                  onClick={closeReportDetails}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedReport.number}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Allocation</label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedReport.allocationGb} GB
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedReport.orderId}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedReport.status)}`}>
                    {getStatusText(selectedReport.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    <div className="font-medium">{selectedReport.reportedByName}</div>
                    <div className="text-gray-500">{selectedReport.reportedByEmail}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(selectedReport.reportDate).toLocaleString()}
                  </div>
                </div>
                {selectedReport.orderDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedReport.orderDate} {selectedReport.orderTime}
                    </div>
                  </div>
                )}
                {selectedReport.processedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Processed At</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(selectedReport.processedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {selectedReport.status === 'pending' && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Resolve Report</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Add notes about the resolution..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Evidence (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload evidence to show data was sent (images or PDF, max 5MB)</p>
                    {evidenceFile && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs text-green-700">
                          ✓ File selected: {evidenceFile.name} ({(evidenceFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleResolve(selectedReport.id, 'resolved')}
                      disabled={resolving === selectedReport.id}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolving === selectedReport.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <ThumbsUp className="w-4 h-4 mr-2" />
                      )}
                      Resolve Issue
                    </button>
                    <button
                      onClick={() => handleResolve(selectedReport.id, 'confirmed_sent')}
                      disabled={resolving === selectedReport.id}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolving === selectedReport.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <ThumbsDown className="w-4 h-4 mr-2" />
                      )}
                      Confirm Sent
                    </button>
                  </div>
                </div>
              )}

              {selectedReport.status !== 'pending' && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Resolution Details</h4>
                  {selectedReport.resolutionDate && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Date</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {new Date(selectedReport.resolutionDate).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedReport.adminNotes && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedReport.adminNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}