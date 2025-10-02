"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Upload, FileText, Check, Download, Phone, Database, AlertCircle, BarChart, History, Calendar, Eye, Trash2, LogOut, User, Shield, Send, FileBox, CheckCircle, DollarSign, Calculator } from "lucide-react";
import { X } from "lucide-react";
import { orderTrackingUtils } from "@/lib/orderTracking";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import SendOrderApp from "@/components/SendOrderApp";
import OrdersApp from "@/components/OrdersApp";
import ProcessedOrdersApp from "@/components/ProcessedOrdersApp";
import SentOrdersApp from "@/components/SentOrdersApp";
import OrderTrackingApp from "@/components/OrderTrackingApp";
import BillingApp from "@/components/BillingApp";
import AccountingApp from "@/components/AccountingApp";
import DarkModeToggle from "@/components/DarkModeToggle";
import { OrderProvider, useOrderCount } from "@/lib/orderContext";
import { ORDER_UPDATED_EVENT } from "@/lib/orderNotifications";
import { requestNotificationPermission, hasNotificationPermission, sendThrottledNotification, playNotificationSound } from '@/lib/notifications';
import { initializeTimeService, getCurrentTimeStringSync, getCurrentDateStringSync, getCurrentTimestampSync, getCurrentTimeSync } from '@/lib/timeService';

type PhoneEntry = {
  number: string;
  allocationGB: number;
  isValid: boolean;
  isDuplicate: boolean;
  wasFixed?: boolean;
};

type AllocationSummary = {
  [key: string]: number;
};

type HistoryEntry = {
  id: string;
  date: string;
  timestamp: number;
  entries: PhoneEntry[];
  totalGB: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  type: 'bundle-allocator' | 'bundle-categorizer';
};

// Helper function to create human-friendly timestamp with AM/PM using external time service
const createTimestamp = (): string => {
  const now = getCurrentTimeSync();
  const datePart = getCurrentDateStringSync(); // YYYY-MM-DD
  
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  
  const timePart = `${hours}-${minutes}-${seconds}${ampm}`;
  return `${datePart}_${timePart}`;
};

// History Manager Component
function HistoryManager({
  history,
  setHistory,
  isSuperAdmin,
  totalDatabaseEntries,
  phoneEntriesCount,
  processedOrderEntriesCount
}: {
  history: HistoryEntry[];
  setHistory: (history: HistoryEntry[]) => void;
  isSuperAdmin: boolean;
  totalDatabaseEntries: number;
  phoneEntriesCount: number;
  processedOrderEntriesCount: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const RECORDS_PER_PAGE = 10;

  // Get unique dates from history
  const availableDates = Array.from(new Set(history.map(entry => entry.date))).sort((a, b) => b.localeCompare(a));

  // Filter history by selected date
  const filteredHistory = selectedDate
    ? history.filter(entry => entry.date === selectedDate)
    : history;

  // Calculate daily summaries
  const dailySummaries = availableDates.map(date => {
    const dayEntries = history.filter(entry => entry.date === date);
    // Calculate total entries as sum of valid + invalid + duplicate counts
    const totalEntries = dayEntries.reduce((sum, entry) => 
      sum + (entry.validCount || 0) + (entry.invalidCount || 0) + (entry.duplicateCount || 0), 0);
    
    // Handle totalGB conversion safely
    const totalGB = dayEntries.reduce((sum, entry) => {
      const entryGB = entry.totalGB !== undefined ? 
        (typeof entry.totalGB === 'string' ? parseFloat(entry.totalGB) : Number(entry.totalGB)) : 0;
      return sum + (isNaN(entryGB) ? 0 : entryGB);
    }, 0);
    const totalValid = dayEntries.reduce((sum, entry) => sum + (entry.validCount || 0), 0);
    const totalInvalid = dayEntries.reduce((sum, entry) => sum + (entry.invalidCount || 0), 0);
    const totalDuplicates = dayEntries.reduce((sum, entry) => sum + (entry.duplicateCount || 0), 0);
    const sessionsCount = dayEntries.length;

    return {
      date,
      totalEntries,
      totalGB: totalGB / 1024, // Convert GB to TB
      totalValid,
      totalInvalid,
      totalDuplicates,
      sessionsCount
    };
  });

  // Calculate pagination for daily summaries
  const summariesToShow = selectedDate
    ? dailySummaries.filter(s => s.date === selectedDate)
    : dailySummaries;
  
  const totalPages = Math.ceil(summariesToShow.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = Math.min(startIndex + RECORDS_PER_PAGE, summariesToShow.length);
  const paginatedSummaries = summariesToShow.slice(startIndex, endIndex);

  // Reset pagination when changing date filter
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  const clearHistory = async () => {
    // Only allow superadmin to clear history
    if (!isSuperAdmin) {
      window.alert && window.alert("❌ Only superadmin can clear history data.");
      return;
    }
    
    const shouldClear = window.confirm && window.confirm("Are you sure you want to clear all history? This action cannot be undone.");
    if (shouldClear) {
      try {
        await fetch('/api/history/clear', { method: 'DELETE' });
        setHistory([]);
        setSelectedDate("");
      } catch (error) {
        console.error('Failed to clear history:', error);
        window.alert && window.alert('❌ Error clearing history. Please try again.');
      }
    }
  };

  const exportHistoryToExcel = async () => {
    if (history.length === 0) {
      window.alert && window.alert("No history data to export");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();

      // Daily Summary Sheet
      const summarySheet = workbook.addWorksheet("Daily Summary");
      summarySheet.addRow([
        "Date",
        "Sessions",
        "Total Entries",
        "Valid Numbers",
        "Invalid Numbers",
        "Duplicates",
        "Total Data (TB)"
      ]);

      dailySummaries.forEach(summary => {
        summarySheet.addRow([
          summary.date,
          summary.sessionsCount,
          summary.totalEntries,
          summary.totalValid,
          summary.totalInvalid,
          summary.totalDuplicates,
          summary.totalGB.toFixed(2)
        ]);
      });

      // Detailed History Sheet
      const detailSheet = workbook.addWorksheet("Detailed History");
      detailSheet.addRow([
        "Date",
        "Time",
        "Type",
        "Phone Number",
        "Allocation (GB)",
        "Status"
      ]);

      history.forEach(entry => {
        entry.entries.forEach(phoneEntry => {
          const status = phoneEntry.isDuplicate ? "Duplicate" :
            phoneEntry.isValid ? "Valid" : "Invalid";
          detailSheet.addRow([
            entry.date,
            new Date(entry.timestamp).toLocaleTimeString(),
            entry.type,
            phoneEntry.number,
            phoneEntry.allocationGB,
            status
          ]);
        });
      });

      // Auto-adjust column widths
      [summarySheet, detailSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          let maxLength = 10;
          if (typeof column.eachCell === "function") {
            column.eachCell({ includeEmpty: true }, (cell) => {
              const cellValue = cell.value ? cell.value.toString() : "";
              maxLength = Math.max(maxLength, cellValue.length);
            });
          }
          column.width = maxLength + 2;
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `History_Report_${getCurrentDateStringSync()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      window.alert && window.alert("✅ History exported successfully!");
    } catch (error) {
      console.error('Export error:', error);
      window.alert && window.alert('❌ Error exporting history. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Controls - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 p-3 sm:p-6 mb-4 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 mb-2">
                  <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  History & Analytics
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Track and analyze your daily data processing activities
                </p>
              </div>
              
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Dates</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>

              <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('summary')}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${viewMode === 'summary'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${viewMode === 'detailed'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Detailed
                </button>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={exportHistoryToExcel}
                  disabled={history.length === 0}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  Export
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    title="Only superadmin can clear history"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-gray-200 shadow-inner">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <History className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">No History Yet</h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
              Process some data using the Bundle Allocator or Categorizer to start building your history
            </p>
          </div>
        ) : viewMode === 'summary' ? (
          /* Summary View */
          <div className="space-y-4 sm:space-y-8">
            {/* Summary Stats - Mobile Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-600 truncate">Total Days</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{availableDates.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-600 truncate">Total Entries</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      {totalDatabaseEntries}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs font-medium text-gray-600 truncate">Total Data</p>
                    <p className="text-xs sm:text-lg font-bold text-gray-900 break-words">
                      {(() => {
                        // Safely calculate the total GB
                        const totalTB = dailySummaries.reduce((sum, day) => {
                          const dayTotalTB = typeof day.totalGB === 'number' 
                            ? day.totalGB 
                            : parseFloat(day.totalGB) || 0;
                          return sum + dayTotalTB;
                        }, 0);
                        
                        return `${totalTB.toFixed(2)} TB`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-600 truncate">Sessions</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{history.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Separate Charts for Better Clarity */}
            {dailySummaries.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Daily Entries Trend Chart */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                      <Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Daily Entries Trend</h3>
                      <p className="text-xs text-gray-600">Number of entries processed per day</p>
                    </div>
                  </div>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySummaries.slice(-30)}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            // Parse date string directly to avoid timezone issues
                            const [year, month, day] = value.split('-').map(Number);
                            const date = new Date(year, month - 1, day); // month is 0-indexed
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          labelFormatter={(value) => {
                            // Parse date string directly to avoid timezone issues
                            const [year, month, day] = value.split('-').map(Number);
                            const date = new Date(year, month - 1, day); // month is 0-indexed
                            return `Date: ${date.toLocaleDateString()}`;
                          }}
                          formatter={(value, name) => {
                            return [value.toLocaleString(), name];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalEntries"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          name="Total Entries"
                          dot={{ r: 4, fill: "#3b82f6" }}
                          activeDot={{ r: 6, fill: "#1d4ed8" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily Data Volume Trend Chart */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                      <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">Daily Data Volume Trend</h3>
                      <p className="text-xs text-gray-600">Amount of data processed per day (TB)</p>
                    </div>
                  </div>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySummaries.slice(-30)}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            // Parse date string directly to avoid timezone issues
                            const [year, month, day] = value.split('-').map(Number);
                            const date = new Date(year, month - 1, day); // month is 0-indexed
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          labelFormatter={(value) => {
                            // Parse date string directly to avoid timezone issues
                            const [year, month, day] = value.split('-').map(Number);
                            const date = new Date(year, month - 1, day); // month is 0-indexed
                            return `Date: ${date.toLocaleDateString()}`;
                          }}
                          formatter={(value, name) => {
                            const numValue = Number(value);
                            return [`${numValue.toFixed(2)} TB`, name];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalGB"
                          stroke="#10b981"
                          strokeWidth={3}
                          name="Total Data Volume"
                          dot={{ r: 4, fill: "#10b981" }}
                          activeDot={{ r: 6, fill: "#047857" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Summary Table - Mobile Scrollable */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Daily Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Sessions</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Entries</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Valid</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Invalid</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Duplicates</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase">Total Data (TB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedSummaries.map((summary) => (
                      <tr key={summary.date} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{summary.date}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{summary.sessionsCount}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{summary.totalEntries}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-600 font-medium">{summary.totalValid}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">{summary.totalInvalid}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-yellow-600 font-medium">{summary.totalDuplicates}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-purple-600">
                          {(() => {
                            // Data is now already in TB
                            const totalTB = typeof summary.totalGB === 'number' 
                              ? summary.totalGB 
                              : parseFloat(summary.totalGB) || 0;
                            
                            return `${totalTB.toFixed(2)} TB`;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{endIndex}</span> of{' '}
                    <span className="font-medium">{summariesToShow.length}</span> results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded-md text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Detailed View */
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Detailed History</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {filteredHistory.length} sessions {selectedDate && `on ${selectedDate}`}
              </p>
            </div>
            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredHistory.map((entry) => (
                <div key={entry.id} className="border-b border-gray-100 p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        {entry.type === 'bundle-allocator' ?
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" /> :
                          <BarChart className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {entry.type === 'bundle-allocator' ? 'Bundle Allocator' : 'Bundle Categorizer'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {entry.date} at {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900">
                        {(() => {
                          // Safely convert totalGB to a number first
                          const totalGB = typeof entry.totalGB === 'number' 
                            ? entry.totalGB 
                            : parseFloat(entry.totalGB) || 0;
                          
                          return totalGB > 1023 
                            ? `${(totalGB / 1024).toFixed(2)} TB` 
                            : `${totalGB.toFixed(2)} GB`;
                        })()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {entry.validCount + entry.invalidCount + entry.duplicateCount} entries
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="bg-green-50 p-2 rounded">
                      <span className="text-green-600 font-medium">Valid: {entry.validCount}</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <span className="text-red-600 font-medium">Invalid: {entry.invalidCount}</span>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded">
                      <span className="text-yellow-600 font-medium">Duplicates: {entry.duplicateCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Bundle Allocator App Component with Enhanced Validation, Splitting, and Excel Support
function BundleAllocatorApp({
  inputText,
  setInputText,
  entries,
  setEntries,
  onAddToHistory
}: {
  inputText: string;
  setInputText: (text: string) => void;
  entries: PhoneEntry[];
  setEntries: (entries: PhoneEntry[]) => void;
  onAddToHistory: (entries: PhoneEntry[], type: 'bundle-allocator' | 'bundle-categorizer') => void;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced validation function that tries to fix numbers by adding leading zero or cleaning input
  const validateNumber = (num: string): { isValid: boolean; correctedNumber: string; wasFixed: boolean } => {
    // Handle empty strings or nulls
    if (!num || typeof num !== 'string' || num.trim() === '') {
      return { isValid: false, correctedNumber: num || '', wasFixed: false };
    }
    
    // Strip any non-digit characters
    const digitsOnly = num.replace(/\D/g, '');
    let wasFixed = false;
    
    // Check if there were non-digits that we stripped
    if (digitsOnly.length !== num.length) {
      wasFixed = true;
    }
    
    // First case: Already valid 10 digits starting with 0
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return { isValid: true, correctedNumber: digitsOnly, wasFixed: wasFixed };
    }
    
    // Second case: 9 digits - try adding a leading zero
    if (digitsOnly.length === 9) {
      const withZero = '0' + digitsOnly;
      return { isValid: true, correctedNumber: withZero, wasFixed: true };
    }
    
    // Third case: 10 digits but doesn't start with 0 - replace first digit with 0
    if (digitsOnly.length === 10 && !digitsOnly.startsWith('0')) {
      const withZero = '0' + digitsOnly.substring(1);
      return { isValid: true, correctedNumber: withZero, wasFixed: true };
    }
    
    // If still invalid, return the original number as invalid
    return { isValid: false, correctedNumber: digitsOnly, wasFixed: wasFixed };
  };

  // Function to read Excel (.xlsx) files
  const readExcelFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          let allText = '';
          workbook.eachSheet((worksheet) => {
            worksheet.eachRow((row, rowNumber) => {
              // Skip header row if it exists
              if (rowNumber === 1) {
                // Check if this looks like a header row
                const firstCell = row.getCell(1).text?.toLowerCase() || '';
                const secondCell = row.getCell(2).text?.toLowerCase() || '';
                const fourthCell = row.getCell(4).text?.toLowerCase() || '';
                if (firstCell.includes('phone') || firstCell.includes('msisdn') || firstCell.includes('number') ||
                    secondCell.includes('data') || secondCell.includes('allocation') || secondCell.includes('gb') ||
                    fourthCell.includes('data') || fourthCell.includes('mb') || fourthCell.includes('gb')) {
                  return; // Skip header row
                }
              }
              
              const phoneNumber = row.getCell(1).text || '';
              let dataAllocation = '';
              
              // Try to get data allocation from different columns
              // Column 2 first (direct allocation)
              if (row.getCell(2).text) {
                dataAllocation = row.getCell(2).text;
              }
              // Then try column 4 (Data MB column from template)
              else if (row.getCell(4).text) {
                const mbValue = parseFloat(row.getCell(4).text);
                if (!isNaN(mbValue)) {
                  // Convert MB to GB
                  dataAllocation = (mbValue / 1024).toFixed(2) + 'GB';
                }
              }
              
              if (phoneNumber && dataAllocation) {
                allText += `${phoneNumber} ${dataAllocation}\n`;
              }
            });
          });
          resolve(allText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Function to read text files (.txt, .csv)
  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // **UPDATED PROCESS INPUT FUNCTION - NEW DUPLICATE LOGIC**
  const processInput = (text: string) => {
    setInputText(text);
    setIsProcessing(true);

    setTimeout(() => {
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");

      const phoneAllocCombinations = new Set<string>();
      const duplicates = new Set<string>();
      let fixedNumbers = 0;

      // First pass: collect all phone number + allocation combinations and identify duplicates
      lines.forEach((line) => {
        const cleanedLine = line.replace(/\./g, " ").trim();
        const parts = cleanedLine.split(/[\s-]+/);

        if (parts.length >= 2) {
          const phoneRaw = parts[0];
          let allocRaw = parts[1];

          allocRaw = allocRaw.replace(/gb$/i, "").trim();

          const allocGB = parseFloat(allocRaw);

          if (!isNaN(allocGB)) {
            const validation = validateNumber(phoneRaw);
            const finalPhoneNumber = validation.correctedNumber;
            
            if (validation.wasFixed) {
              fixedNumbers++;
            }

            // Create unique key combining phone number AND allocation
            const uniqueKey = `${finalPhoneNumber}-${allocGB}`;

            if (phoneAllocCombinations.has(uniqueKey)) {
              duplicates.add(uniqueKey);
            } else {
              phoneAllocCombinations.add(uniqueKey);
            }
          }
        }
      });

      // Second pass: create entries with duplicate flag and validation results
      // Only keep the first occurrence of each phone number + allocation combination
      const parsed: PhoneEntry[] = [];
      const seenCombinations = new Set<string>();

      lines.forEach((line) => {
        const cleanedLine = line.replace(/\./g, " ").trim();
        const parts = cleanedLine.split(/[\s-]+/);

        if (parts.length >= 2) {
          const phoneRaw = parts[0];
          let allocRaw = parts[1];

          allocRaw = allocRaw.replace(/gb$/i, "").trim();

          const allocGB = parseFloat(allocRaw);

          if (!isNaN(allocGB)) {
            const validation = validateNumber(phoneRaw);
            const uniqueKey = `${validation.correctedNumber}-${allocGB}`;
            
            // Only add if this is the first occurrence of this combination
            if (!seenCombinations.has(uniqueKey)) {
              seenCombinations.add(uniqueKey);
              
              parsed.push({
                number: validation.correctedNumber,
                allocationGB: allocGB,
                isValid: validation.isValid,
                isDuplicate: false, // No entries are marked as duplicate since we remove them
                wasFixed: validation.wasFixed,
              });
            }
            // Skip duplicate entries (don't add them to parsed array)
          }
        }
      });

      // Show alerts for removed duplicates and fixed numbers
      const alertMessages: string[] = [];
      const totalDuplicates = lines.length - parsed.length;
      
      if (totalDuplicates > 0) {
        alertMessages.push(`🗑️ Removed ${totalDuplicates} duplicate entry(ies).\n\nDuplicates are identified by matching both phone number AND data allocation.\nOnly the first occurrence of each combination was kept.`);
      }
      
      if (fixedNumbers > 0) {
        alertMessages.push(`✅ Auto-fixed ${fixedNumbers} phone number(s) by adding leading zero.\n\nFixed numbers are marked with a cyan icon.`);
      }

      if (alertMessages.length > 0) {
        window.alert && window.alert(alertMessages.join('\n\n'));
      }

      setEntries(parsed);
      setIsProcessing(false);
    }, 300);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        let content: string;
        
        // Check file extension to determine how to read it
        const fileExtension = file.name.toLowerCase().split('.').pop();
        
        if (fileExtension === 'xlsx') {
          content = await readExcelFile(file);
        } else {
          content = await readTextFile(file);
        }
        
        processInput(content);
      } catch (error) {
        console.error('Error reading file:', error);
        window.alert && window.alert(`❌ Error reading file "${file.name}". Please make sure it's a valid Excel (.xlsx), CSV (.csv), or text (.txt) file.`);
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    onDrop(files);
  };

  const handleDropZoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onDrop(files);
      e.target.value = '';
    }
  };

  // Helper function to create and download ZIP file
  const downloadZip = async (files: { name: string; blob: Blob }[], zipName: string) => {
    const zip = new JSZip();
    
    files.forEach(file => {
      zip.file(file.name, file.blob);
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    if (entries.length === 0) {
      window.alert && window.alert("No data to export");
      return;
    }

    setIsExporting(true);

    try {
      const MAX_TB_PER_FILE = 1.5;
      const MAX_GB_PER_FILE = MAX_TB_PER_FILE * 1024; // 1536 GB
      
      const totalGB = entries.reduce((sum, entry) => sum + entry.allocationGB, 0);
      const needsSplitting = totalGB > MAX_GB_PER_FILE;
      
      if (needsSplitting) {
        // Create human-readable timestamp with AM/PM
        const timestamp = createTimestamp();
        
        // Split files and create ZIP
        const validEntries = entries.filter(entry => entry.isValid && !entry.isDuplicate);
        const problematicEntries = entries.filter(entry => !entry.isValid || entry.isDuplicate);
        
        const fileChunks: PhoneEntry[][] = [];
        let currentChunk: PhoneEntry[] = [];
        let currentChunkGB = 0;
        
        const sortedValidEntries = [...validEntries].sort((a, b) => b.allocationGB - a.allocationGB);
        
        for (const entry of sortedValidEntries) {
          if (currentChunkGB + entry.allocationGB > MAX_GB_PER_FILE && currentChunk.length > 0) {
            fileChunks.push(currentChunk);
            currentChunk = [];
            currentChunkGB = 0;
          }
          
          currentChunk.push(entry);
          currentChunkGB += entry.allocationGB;
        }
        
        if (currentChunk.length > 0) {
          fileChunks.push(currentChunk);
        }
        
        if (problematicEntries.length > 0) {
          if (fileChunks.length === 0) {
            fileChunks.push(problematicEntries);
          } else {
            fileChunks[fileChunks.length - 1].push(...problematicEntries);
          }
        }
        
        const excelFiles: { name: string; blob: Blob }[] = [];
        
        for (let i = 0; i < fileChunks.length; i++) {
          const chunk = fileChunks[i];
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("PhoneData");
          
          worksheet.addRow([
            "Beneficiary Msisdn",
            "Beneficiary Name", 
            "Voice(Minutes)",
            "Data (MB) (1024MB = 1GB)",
            "Sms(Unit)",
          ]);

          let sortedChunk = chunk;
          if (i === fileChunks.length - 1) {
            const validInChunk = chunk.filter(entry => entry.isValid && !entry.isDuplicate);
            const invalidInChunk = chunk.filter(entry => !entry.isValid);
            const duplicateInChunk = chunk.filter(entry => entry.isDuplicate);
            
            const duplicateGroups = new Map<string, PhoneEntry[]>();
            duplicateInChunk.forEach(entry => {
              const key = `${entry.number}-${entry.allocationGB}`;
              if (!duplicateGroups.has(key)) {
                duplicateGroups.set(key, []);
              }
              duplicateGroups.get(key)!.push(entry);
            });
            
            const groupedDuplicates: PhoneEntry[] = [];
            duplicateGroups.forEach(group => {
              groupedDuplicates.push(...group);
            });
            
            sortedChunk = [...validInChunk, ...invalidInChunk, ...groupedDuplicates];
          }

          sortedChunk.forEach(({ number, allocationGB, isValid, isDuplicate }) => {
            const mb = allocationGB * 1024;
            const row = worksheet.addRow([number, "", 0, mb, 0]);
            
            if (!isValid) {
              row.getCell(1).font = { color: { argb: "FFFF0000" }, bold: true };
            }
            
            if (isDuplicate) {
              row.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
              };
            }
          });

          worksheet.columns.forEach((column) => {
            let maxLength = 10;
            if (typeof column.eachCell === "function") {
              column.eachCell({ includeEmpty: true }, (cell) => {
                const cellValue = cell.value ? cell.value.toString() : "";
                maxLength = Math.max(maxLength, cellValue.length);
              });
            }
            column.width = maxLength + 2;
          });

          const lastRowNum = worksheet.lastRow?.number || sortedChunk.length + 1;
          const totalRowNum = lastRowNum + 5;
          
          worksheet.getCell(`F${totalRowNum}`).value = { formula: `SUM(D2:D${lastRowNum})` };
          worksheet.getCell(`G${totalRowNum}`).value = { formula: `F${totalRowNum}/1024` };
          worksheet.getCell(`F${totalRowNum}`).font = { bold: true };
          worksheet.getCell(`G${totalRowNum}`).font = { bold: true };

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          
          excelFiles.push({
            name: `UploadTemplate_Part${i + 1}_of_${fileChunks.length}.xlsx`,
            blob: blob
          });
        }
        
        const zipName = `UploadTemplate_Splitted_${timestamp}.zip`;
        await downloadZip(excelFiles, zipName);
        
        const validCount = validEntries.length;
        const duplicateCount = entries.filter(entry => entry.isDuplicate).length;
        const invalidCount = entries.filter(entry => !entry.isValid).length;
        const fixedCount = entries.filter(entry => entry.wasFixed).length;
        const totalMB = entries.reduce((sum, entry) => sum + (entry.allocationGB * 1024), 0);
        
        let successMessage = `✅ Files exported and zipped successfully!\n\nData was split into ${fileChunks.length} files due to size (${
          totalGB > 1023 
          ? `${(totalGB / 1024).toFixed(2)} TB` 
          : `${totalGB.toFixed(2)} GB`
        } > ${MAX_TB_PER_FILE} TB limit)\n\nTotal processed: ${entries.length} entries\nValid: ${validCount}\nInvalid: ${invalidCount}\nDuplicates: ${duplicateCount}`;
        
        if (fixedCount > 0) {
          successMessage += `\nAuto-fixed: ${fixedCount}`;
        }
        
        successMessage += `\n\nTotal Data: ${
          totalGB > 1023 
          ? `${(totalGB / 1024).toFixed(2)} TB (${totalMB.toFixed(0)} MB)` 
          : `${totalGB.toFixed(2)} GB (${totalMB.toFixed(0)} MB)`
        }`;

        window.alert && window.alert(successMessage);

      } else {
        // Single file export (original logic)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("PhoneData");

        worksheet.addRow([
          "Beneficiary Msisdn",
          "Beneficiary Name",
          "Voice(Minutes)",
          "Data (MB) (1024MB = 1GB)",
          "Sms(Unit)",
        ]);

        entries.forEach(({ number, allocationGB, isValid, isDuplicate }) => {
          const mb = allocationGB * 1024;
          const row = worksheet.addRow([number, "", 0, mb, 0]);

          if (!isValid) {
            row.getCell(1).font = { color: { argb: "FFFF0000" }, bold: true };
          }

          if (isDuplicate) {
            row.getCell(1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF00' }
            };
          }
        });

        worksheet.columns.forEach((column) => {
          let maxLength = 10;
          if (typeof column.eachCell === "function") {
            column.eachCell({ includeEmpty: true }, (cell) => {
              const cellValue = cell.value ? cell.value.toString() : "";
              maxLength = Math.max(maxLength, cellValue.length);
            });
          }
          column.width = maxLength + 2;
        });

        const lastRowNum = worksheet.lastRow?.number || entries.length + 1;
        const totalRowNum = lastRowNum + 5;

        worksheet.getCell(`F${totalRowNum}`).value = { formula: `SUM(D2:D${lastRowNum})` };
        worksheet.getCell(`G${totalRowNum}`).value = { formula: `F${totalRowNum}/1024` };
        worksheet.getCell(`F${totalRowNum}`).font = { bold: true };
        worksheet.getCell(`G${totalRowNum}`).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'UploadTemplate.xlsx';
        link.click();
        URL.revokeObjectURL(url);

        const validEntries = entries.filter(entry => entry.isValid && !entry.isDuplicate);
        const duplicateCount = entries.filter(entry => entry.isDuplicate).length;
        const invalidCount = entries.filter(entry => !entry.isValid).length;
        const fixedCount = entries.filter(entry => entry.wasFixed).length;
        const totalMB = entries.reduce((sum, entry) => sum + (entry.allocationGB * 1024), 0);

        let successMessage = `✅ Excel file exported successfully!\n\nTotal exported: ${entries.length} entries\nValid: ${validEntries.length}\nDuplicates: ${duplicateCount}\nInvalid: ${invalidCount}`;
        
        if (fixedCount > 0) {
          successMessage += `\nAuto-fixed: ${fixedCount}`;
        }
        
        successMessage += `\n\nTotal Data: ${
          totalGB > 1023 
          ? `${(totalGB / 1024).toFixed(2)} TB (${totalMB.toFixed(0)} MB)` 
          : `${totalGB.toFixed(2)} GB (${totalMB.toFixed(0)} MB)`
        }`;

        window.alert && window.alert(successMessage);
      }

      onAddToHistory(entries, 'bundle-allocator');

      setInputText("");
      setEntries([]);

    } catch (error) {
      console.error('Export error:', error);
      window.alert && window.alert('❌ Error exporting to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const validEntries = entries.filter(entry => entry.isValid && !entry.isDuplicate);
  const invalidEntries = entries.filter(entry => !entry.isValid);
  const duplicateEntries = entries.filter(entry => entry.isDuplicate);
  const fixedEntries = entries.filter(entry => entry.wasFixed);
  const totalGB = entries.reduce((sum, entry) => sum + entry.allocationGB, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Input Section - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4 sm:mb-8 transition-all hover:shadow-2xl">
          <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span>Input Data</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Paste phone numbers with allocations or drag & drop a file
            </p>
          </div>

          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            <div className="relative">
              <textarea
                placeholder="Paste phone numbers and data allocations here&#10;0554739033 20GB&#10;0201234567 15GB&#10;0556789012 10GB"
                className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none font-mono text-sm sm:text-base text-gray-900 bg-white shadow-sm hover:shadow-md placeholder:text-gray-500"
                rows={6}
                value={inputText}
                onChange={(e) => processInput(e.target.value)}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-lg sm:rounded-xl">
                  <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                </div>
              )}
            </div>

            {/* File Drop Zone - Mobile Optimized with Excel support */}
            <div
              onClick={handleDropZoneClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-8 text-center cursor-pointer transition-all duration-300 ${isDragActive
                  ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-lg"
                  : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                }`}
            >
              <div className={`w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-4 flex items-center justify-center rounded-full ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              {isDragActive ? (
                <p className="text-blue-600 font-bold text-sm sm:text-lg">Drop your file here!</p>
              ) : (
                <>
                  <p className="text-gray-700 font-medium mb-1 sm:mb-2 text-sm sm:text-base">Drag & drop Excel, CSV or TXT files</p>
                  <p className="text-xs sm:text-sm text-gray-500">Supports .xlsx, .csv, and .txt files</p>
                </>
              )}
            </div>

            {/* Hidden file input - Updated to accept Excel files */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".txt,.csv,.xlsx"
              className="hidden"
              multiple
            />
          </div>
        </div>

        {/* Stats Cards - Mobile Optimized Grid */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-8">
            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Database className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-600 truncate">Total Entries</p>
                  <p className="text-sm sm:text-xl font-bold text-gray-900">{entries.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Check className="w-3 h-3 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-600 truncate">Valid Numbers</p>
                  <p className="text-sm sm:text-xl font-bold text-green-600">{validEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
                  <X className="w-3 h-3 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-600 truncate">Invalid Numbers</p>
                  <p className="text-sm sm:text-xl font-bold text-red-600">{invalidEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                  <AlertCircle className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-600 truncate">Duplicates</p>
                  <p className="text-sm sm:text-xl font-bold text-yellow-600">{duplicateEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-cyan-100 rounded-lg flex-shrink-0">
                  <Check className="w-3 h-3 sm:w-5 sm:h-5 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-600 truncate">Auto-Fixed</p>
                  <p className="text-sm sm:text-xl font-bold text-cyan-600">{fixedEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Database className="w-3 h-3 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-gray-600 truncate">Total Data</p>
                  <p className="text-xs sm:text-sm font-bold text-purple-600 break-words">{totalGB.toFixed(1)}GB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section - Mobile Optimized */}
        {entries.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all hover:shadow-2xl">
            <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col gap-3 sm:gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  <span>Processed Results</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {validEntries.length} valid, {invalidEntries.length} invalid, {duplicateEntries.length} duplicates
                  {fixedEntries.length > 0 && `, ${fixedEntries.length} auto-fixed`}
                </p>
              </div>

              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-white rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${isExporting
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium text-sm sm:text-base">Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium text-sm sm:text-base">Export to Excel</span>
                  </>
                )}
              </button>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 divide-y divide-gray-100">
                {entries.map(({ number, allocationGB, isValid, isDuplicate, wasFixed }, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 sm:p-4 transition-all duration-200 hover:bg-gray-50 ${isDuplicate ? 'bg-yellow-50' : !isValid ? 'bg-red-50' : wasFixed ? 'bg-cyan-50' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      {isDuplicate ? (
                        <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-full flex-shrink-0">
                          <AlertCircle className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-600" />
                        </div>
                      ) : !isValid ? (
                        <div className="p-1.5 sm:p-2 bg-red-100 rounded-full flex-shrink-0">
                          <AlertCircle className="w-3 h-3 sm:w-5 sm:h-5 text-red-600" />
                        </div>
                      ) : wasFixed ? (
                        <div className="p-1.5 sm:p-2 bg-cyan-100 rounded-full flex-shrink-0">
                          <Check className="w-3 h-3 sm:w-5 sm:h-5 text-cyan-600" />
                        </div>
                      ) : (
                        <div className="p-1.5 sm:p-2 bg-green-100 rounded-full flex-shrink-0">
                          <Check className="w-3 h-3 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`font-mono font-medium text-sm sm:text-base break-all ${isDuplicate ? 'text-yellow-700' : !isValid ? 'text-red-700' : wasFixed ? 'text-cyan-700' : 'text-gray-900'
                          }`}>
                          {number}
                        </p>
                        {isDuplicate && (
                          <p className="text-xs text-yellow-600 font-medium mt-1">Duplicate entry</p>
                        )}
                        {!isValid && !isDuplicate && (
                          <p className="text-xs text-red-600 font-medium mt-1">Invalid format</p>
                        )}
                        {wasFixed && isValid && !isDuplicate && (
                          <p className="text-xs text-cyan-600 font-medium mt-1">Auto-fixed (added leading zero)</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`font-bold text-sm sm:text-lg ${isDuplicate ? 'text-yellow-700' : !isValid ? 'text-red-700' : wasFixed ? 'text-cyan-700' : 'text-gray-900'
                        }`}>
                        {allocationGB} GB
                      </p>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {(allocationGB * 1024).toFixed(0)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State - Mobile Optimized */}
        {entries.length === 0 && !isProcessing && (
          <div className="text-center py-8 sm:py-12 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-gray-200 shadow-inner">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Phone className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Ready to Process Data</h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
              Enter phone numbers above or drag & drop a file to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Bundle Categorizer App Component with Enhanced Validation and Excel Support
function BundleCategorizerApp({
  rawData,
  setRawData,
  summary,
  setSummary,
  chartData,
  setChartData,
  onAddToHistory
}: {
  rawData: string;
  setRawData: (data: string) => void;
  summary: Array<{ allocation: string, count: number }>;
  setSummary: (summary: Array<{ allocation: string, count: number }>) => void;
  chartData: Array<{ allocation: string, count: number }>;
  setChartData: (data: Array<{ allocation: string, count: number }>) => void;
  onAddToHistory: (entries: PhoneEntry[], type: 'bundle-allocator' | 'bundle-categorizer') => void;
}) {
  // Enhanced validation function with more sophisticated fixing capabilities
  const validateNumber = (num: string): { isValid: boolean; correctedNumber: string; wasFixed: boolean } => {
    // Handle empty strings or nulls
    if (!num || typeof num !== 'string' || num.trim() === '') {
      return { isValid: false, correctedNumber: num || '', wasFixed: false };
    }
    
    // Strip any non-digit characters
    const digitsOnly = num.replace(/\D/g, '');
    let wasFixed = false;
    
    // Check if there were non-digits that we stripped
    if (digitsOnly.length !== num.length) {
      wasFixed = true;
    }
    
    // First case: Already valid 10 digits starting with 0
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return { isValid: true, correctedNumber: digitsOnly, wasFixed: wasFixed };
    }
    
    // Second case: 9 digits - try adding a leading zero
    if (digitsOnly.length === 9) {
      const withZero = '0' + digitsOnly;
      return { isValid: true, correctedNumber: withZero, wasFixed: true };
    }
    
    // Third case: 10 digits but doesn't start with 0 - replace first digit with 0
    if (digitsOnly.length === 10 && !digitsOnly.startsWith('0')) {
      const withZero = '0' + digitsOnly.substring(1);
      return { isValid: true, correctedNumber: withZero, wasFixed: true };
    }
    
    // If still invalid, return the original number as invalid
    return { isValid: false, correctedNumber: digitsOnly, wasFixed: wasFixed };
  };

  const parseData = () => {
    const lines = rawData.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    const allocationSummary: AllocationSummary = {};
    const processedEntries: PhoneEntry[] = [];
    let fixedNumbers = 0;

    lines.forEach(line => {
      const parts = line.split(/[\s-]+/);
      const phoneNumber = parts[0] || "";
      let allocation = parts[1] || "";
      allocation = allocation.replace(/[^0-9]/g, "");

      let allocationGB = 0;
      let allocKey = "";

      if (allocation) {
        allocKey = allocation + " GB";
        allocationGB = parseInt(allocation) || 0;
      } else {
        allocKey = "Unknown";
        allocationGB = 0;
      }

      allocationSummary[allocKey] = (allocationSummary[allocKey] || 0) + 1;

      // Enhanced validation with auto-fix
      const validation = validateNumber(phoneNumber);
      if (validation.wasFixed) {
        fixedNumbers++;
      }

      // Create phone entry for history
      processedEntries.push({
        number: validation.correctedNumber,
        allocationGB: allocationGB,
        isValid: validation.isValid,
        isDuplicate: false,
        wasFixed: validation.wasFixed
      });
    });

    const summaryArray = Object.entries(allocationSummary).map(([key, value]) => ({
      allocation: key,
      count: value as number,
    }));

    const sortedSummaryArray = summaryArray.sort((a, b) => {
      if (a.allocation === "Unknown" && b.allocation === "Unknown") return 0;
      if (a.allocation === "Unknown") return 1;
      if (b.allocation === "Unknown") return -1;

      const aValue = parseInt(a.allocation.replace(/[^0-9]/g, "")) || 0;
      const bValue = parseInt(b.allocation.replace(/[^0-9]/g, "")) || 0;

      const aNum = isNaN(aValue) ? 0 : aValue;
      const bNum = isNaN(bValue) ? 0 : bValue;

      return aNum - bNum;
    });

    setSummary(sortedSummaryArray);
    setChartData(sortedSummaryArray);

    // Show alert for fixed numbers
    if (fixedNumbers > 0) {
      window.alert && window.alert(`✅ Auto-fixed ${fixedNumbers} phone number(s) by adding leading zero.`);
    }

    // Add to history
    onAddToHistory(processedEntries, 'bundle-categorizer');

    setRawData("");
  };

  const totalEntries = summary.reduce((total, row) => total + row.count, 0);
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Input Section - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 mb-4 sm:mb-8 border border-gray-200 transition-all hover:shadow-2xl">
          <div className="mb-4 sm:mb-6">
            <label className="text-base font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Data Input
            </label>
            <textarea
              className="w-full h-32 sm:h-48 p-3 sm:p-4 border border-gray-300 rounded-lg sm:rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm sm:text-base text-gray-900 bg-white hover:shadow-md placeholder:text-gray-500"
              placeholder="Paste your data here...&#10;Example:&#10;024XXXXXXXX 20GB&#10;059XXXXXXXX 50GB&#10;0249XXXXXXX 10GB"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              {rawData.split('\n').filter(line => line.trim().length > 0).length} lines detected
            </div>
            <button
              onClick={parseData}
              disabled={!rawData.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <BarChart className="w-4 h-4 sm:w-5 sm:h-5" />
              Process Data
            </button>
          </div>
        </div>

        {/* Results Section - Mobile Optimized */}
        {summary.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Summary Table - Mobile Optimized */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 border border-gray-200 transition-all hover:shadow-2xl">
              <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Summary</h2>
                <div className="bg-blue-100 text-blue-800 px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-center">
                  {totalEntries} total entries
                </div>
              </div>

              <div className="overflow-hidden rounded-lg sm:rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Data Allocation
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                              <span className="truncate">{row.allocation}</span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700">
                            <span className="bg-gray-100 px-2 sm:px-3 py-1 rounded-full font-bold">
                              {row.count}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 sm:h-2.5">
                                <div
                                  className="h-1.5 sm:h-2.5 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(row.count / totalEntries * 100)}%`,
                                    backgroundColor: COLORS[idx % COLORS.length]
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs sm:text-sm font-bold flex-shrink-0">
                                {((row.count / totalEntries) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Chart Section - Mobile Height Adjusted */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 border border-gray-200 transition-all hover:shadow-2xl">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-6">Visualization</h2>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-2 sm:p-4 border border-gray-200">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsBarChart data={chartData}>
                    <XAxis
                      dataKey="allocation"
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ADD8E6',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'black',
                        fontSize: '14px'
                      }}
                      formatter={(value) => [value, 'Count']}
                      labelFormatter={(label) => `Allocation: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Number of Entries"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - Mobile Optimized */}
        {summary.length === 0 && rawData.trim() === "" && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl shadow-inner p-8 sm:p-12 text-center border border-gray-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <BarChart className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">Ready to Analyze Data</h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
              Paste your data in the input field above and click "Process Data" to see allocation summaries and visualizations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Using notification utilities imported at the top of the file

// Component to display the tabs with order count notification
function TabNavigation({ 
  activeTab, 
  setActiveTab, 
  tabs, 
  isAdmin, 
  isSuperAdmin,
  history 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void; 
  tabs: Array<{ id: string; name: string; icon: any; roles?: string[] }>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  history: any[];
}) {
  // Use the order counts from context
  const { orderCount, processedOrderCount, sentOrderCount, refreshOrderCount } = useOrderCount();
  
  // Using the imported orderTrackingUtils for tracking unread counts
  // State to track notification indicators
  const [notificationPermissionRequested, setNotificationPermissionRequested] = useState(false);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);
  const [prevOrderCount, setPrevOrderCount] = useState(0);
  const [prevProcessedOrderCount, setPrevProcessedOrderCount] = useState(0);
  const [prevSentOrderCount, setPrevSentOrderCount] = useState(0);
  
  // State for unread counts
  const [unreadPendingOrders, setUnreadPendingOrders] = useState(0);
  const [unreadProcessedOrders, setUnreadProcessedOrders] = useState(0);
  const [unreadSentOrders, setUnreadSentOrders] = useState(0);
  
  // Request notification permission when component mounts
  useEffect(() => {
    const requestPermission = async () => {
      if (!notificationPermissionRequested) {
        await requestNotificationPermission();
        setNotificationPermissionRequested(true);
      }
    };
    
    requestPermission();
  }, [notificationPermissionRequested]);

  // Initialize external time service when component mounts
  useEffect(() => {
    const initTime = async () => {
      try {
        await initializeTimeService();
        console.log('✅ External time service initialized successfully');
      } catch (error) {
        console.warn('⚠️ Time service initialization failed, using local time as fallback:', error);
      }
    };
    
    initTime();
  }, []);
  
  // Initialize order tracking when component mounts
  useEffect(() => {
    console.log('Initializing order tracking component with counts:', {
      orderCount,
      processedOrderCount, 
      sentOrderCount
    });
    
    // Ensure counts are valid numbers
    const safeOrderCount = orderCount || 0;
    const safeProcessedOrderCount = processedOrderCount || 0;
    const safeSentOrderCount = sentOrderCount || 0;
    
    // Initialize tracking with current counts
    orderTrackingUtils.initializeTracking(
      safeOrderCount,
      safeProcessedOrderCount,
      safeSentOrderCount
    );
    
    // Set the active tab in tracking system
    orderTrackingUtils.setActiveTab(activeTab);
    
    // Get initial unread counts
    const pendingUnread = orderTrackingUtils.getUnreadPendingOrders();
    const processedUnread = orderTrackingUtils.getUnreadProcessedOrders();
    const sentUnread = orderTrackingUtils.getUnreadSentOrders();
    
    console.log('Initial unread counts:', {
      pendingUnread,
      processedUnread,
      sentUnread
    });
    
    setUnreadPendingOrders(pendingUnread);
    setUnreadProcessedOrders(processedUnread);
    setUnreadSentOrders(sentUnread);
    
    // Initialize previous counts
    setPrevOrderCount(safeOrderCount);
    setPrevProcessedOrderCount(safeProcessedOrderCount);
    setPrevSentOrderCount(safeSentOrderCount);
    
    // If no orders, no need to continue
    if (safeOrderCount === 0 && safeProcessedOrderCount === 0 && safeSentOrderCount === 0) {
      return;
    }
    
    // Only set unread counts if explicitly requested, starting with 0 by default
    // Removing auto-assignment of unread counts on component mount
    console.log('Initial counts maintained at:', {
      pendingUnread,
      processedUnread,
      sentUnread
    });
    
  }, [orderCount, processedOrderCount, sentOrderCount, activeTab]);
  
  // Update tracking system when tab changes or counts change
  useEffect(() => {
    // Set the active tab in tracking system
    orderTrackingUtils.setActiveTab(activeTab);
    
    console.log('Current counts in TabNavigation:', { 
      orderCount, 
      processedOrderCount, 
      sentOrderCount,
      prevOrderCount,
      prevProcessedOrderCount,
      prevSentOrderCount
    });
    
    // Ensure all counts are valid numbers, defaulting to 0 if undefined
    const safeOrderCount = orderCount || 0;
    const safeProcessedOrderCount = processedOrderCount || 0;
    const safeSentOrderCount = sentOrderCount || 0;
    const safePrevOrderCount = prevOrderCount || 0;
    const safePrevProcessedOrderCount = prevProcessedOrderCount || 0;
    const safePrevSentOrderCount = prevSentOrderCount || 0;
    
    // Check for order count changes
    if (safeOrderCount !== safePrevOrderCount || 
        safeProcessedOrderCount !== safePrevProcessedOrderCount || 
        safeSentOrderCount !== safePrevSentOrderCount) {
      
      console.log('Detected count change, updating tracking system');
      
      // Update the tracking system
      const { hasNewPending, hasNewProcessed, hasNewSent } = orderTrackingUtils.updateOrderCounts(
        safeOrderCount,
        safeProcessedOrderCount,
        safeSentOrderCount
      );
      
      // Get updated unread counts
      const updatedPendingUnread = orderTrackingUtils.getUnreadPendingOrders();
      const updatedProcessedUnread = orderTrackingUtils.getUnreadProcessedOrders();
      const updatedSentUnread = orderTrackingUtils.getUnreadSentOrders();
      
      console.log('Updated unread counts:', {
        pendingUnread: updatedPendingUnread,
        processedUnread: updatedProcessedUnread,
        sentUnread: updatedSentUnread,
        hasNewPending,
        hasNewProcessed,
        hasNewSent
      });
      
      setUnreadPendingOrders(updatedPendingUnread);
      setUnreadProcessedOrders(updatedProcessedUnread);
      setUnreadSentOrders(updatedSentUnread);
      
      // Show notification badge for new pending orders
      if (hasNewPending && activeTab !== 'orders') {
        setShowNotificationBadge(true);
        const hideTimer = setTimeout(() => {
          setShowNotificationBadge(false);
        }, 5000);
        
        // Play notification sound
        playNotificationSound(0.3).catch(err => console.log('Error playing sound:', err));
        
        // Show browser notification if we have permission
        if (hasNotificationPermission()) {
          const newOrdersCount = safeOrderCount - safePrevOrderCount;
          sendThrottledNotification(
            `${newOrdersCount} New Order${newOrdersCount > 1 ? 's' : ''}`, 
            { 
              body: `You have ${newOrdersCount} new order${newOrdersCount > 1 ? 's' : ''} pending review.`,
              tag: 'new-orders',
              requireInteraction: true,
              // @ts-ignore - Notification onClick is available but may have type issues
              onClick: () => {
                window.focus();
                setActiveTab('orders');
              }
            }
          );
        }
        
        return () => clearTimeout(hideTimer);
      }
      
      // Notify for new processed orders
      if (hasNewProcessed && activeTab !== 'processed-orders') {
        // Play notification sound at lower volume for processed orders
        playNotificationSound(0.9).catch(err => console.log('Error playing sound:', err));
        
        // Show browser notification if we have permission
        if (hasNotificationPermission()) {
          const newProcessedCount = safeProcessedOrderCount - safePrevProcessedOrderCount;
          sendThrottledNotification(
            `${newProcessedCount} Order${newProcessedCount > 1 ? 's' : ''} Processed`, 
            { 
              body: `${newProcessedCount} order${newProcessedCount > 1 ? 's have' : ' has'} been processed and ${newProcessedCount > 1 ? 'are' : 'is'} ready for review.`,
              tag: 'processed-orders',
              // @ts-ignore
              onClick: () => {
                window.focus();
                setActiveTab('processed-orders');
              }
            }
          );
        }
      }
      
      // Update previous counts
      setPrevOrderCount(safeOrderCount);
      setPrevProcessedOrderCount(safeProcessedOrderCount);
      setPrevSentOrderCount(safeSentOrderCount);
    }
  }, [
    activeTab, 
    orderCount, 
    processedOrderCount, 
    sentOrderCount,
    prevOrderCount,
    prevProcessedOrderCount,
    prevSentOrderCount,
    setActiveTab
  ]);
  
  // Refresh counts when the component mounts or when the active tab changes
  useEffect(() => {
    // Immediately refresh counts when mounting or switching tabs
    refreshOrderCount();
    
    // Try refreshing again after a short delay (for slow connections)
    const initialRefreshTimer = setTimeout(() => {
      refreshOrderCount();
    }, 1500);
    
    // Initialize notification counters with zero values
    // This ensures badges start with 0 instead of 1
    if (orderCount === 0 && processedOrderCount === 0 && sentOrderCount === 0) {
      console.log('No counts found, initializing notification badges to zero');
      orderTrackingUtils.updateOrderCounts(0, 0, 0);
      setUnreadPendingOrders(0);
      setUnreadProcessedOrders(0);
      setUnreadSentOrders(0);
    }
    
    // Set up ORDER_UPDATED_EVENT listener
    const handleOrderUpdate = () => {
      console.log('TabNavigation: ORDER_UPDATED_EVENT received, refreshing counts');
      refreshOrderCount();
    };
    
    window.addEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    
    // Set up polling interval with a much longer interval (1 minute)
    // This reduces bandwidth usage while still keeping data reasonably fresh
    const intervalId = setInterval(() => {
      refreshOrderCount();
      console.log('Low-frequency poll refresh - Current counts:', {
        pending: orderCount, 
        processed: processedOrderCount, 
        sent: sentOrderCount,
        unreadPending: unreadPendingOrders,
        unreadProcessed: unreadProcessedOrders,
        unreadSent: unreadSentOrders
      });
    }, 60000); // 1 minute
    
    // Clean up event listener and interval on unmount
    return () => {
      clearTimeout(initialRefreshTimer);
      window.removeEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
      clearInterval(intervalId);
    };
  }, [activeTab, refreshOrderCount, orderCount, processedOrderCount, sentOrderCount, 
      unreadPendingOrders, unreadProcessedOrders, unreadSentOrders]);
  
  // Handle tab click with tracking integration
  const handleTabClick = (e: React.MouseEvent, tabId: string) => {
    // Prevent navigation events
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Set the active tab
    setActiveTab(tabId);
    
    // Update tracking system
    orderTrackingUtils.setActiveTab(tabId);
    
    // Clear unread counts when navigating to a specific tab
    if (tabId === 'orders') {
      orderTrackingUtils.clearUnreadPendingOrders();
      setUnreadPendingOrders(0);
    } else if (tabId === 'processed-orders') {
      orderTrackingUtils.clearUnreadProcessedOrders();
      setUnreadProcessedOrders(0);
    } else if (tabId === 'sent-orders') {
      orderTrackingUtils.clearUnreadSentOrders();
      setUnreadSentOrders(0);
    }
    
    // Refresh counts
    refreshOrderCount();
    
    return false;
  };
  
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 w-full" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <div 
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={(e) => handleTabClick(e, tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabClick(e as any, tab.id);
              }
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-t-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm cursor-pointer min-w-max ${
                tab.id === "history" ? "sm:min-w-[180px] " : ""
              }${activeTab === tab.id
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span 
              className="hidden sm:inline truncate" 
              title={tab.name} // Add tooltip for desktop view
              style={{ maxWidth: tab.id === "history" ? "150px" : "120px" }} // Give more space to History & Analytics
            >
              {tab.name}
            </span>
            <span className="sm:hidden">
              {tab.id === "bundle-allocator" ? "Allocator" :
               tab.id === "bundle-categorizer" ? "Categorizer" :
               tab.id === "send-order" ? "Send" :
               tab.id === "orders" ? "Orders" :
               tab.id === "processed-orders" ? "Processed" :
               tab.id === "sent-orders" ? "My Orders" : 
               tab.id === "history" ? "History & A." : "History"}
            </span>
            {tab.id === "history" && isSuperAdmin && history.length > 0 && (
              <span className="bg-white/20 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                {history.length}
              </span>
            )}
            
            {/* Orders tab badge with unread indicators */}
            {tab.id === "orders" && (
              <span 
                className={`relative ${
                  unreadPendingOrders > 0 
                    ? "bg-red-500 text-white animate-pulse" 
                    : orderCount > 0 ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"
                } text-xs px-2 py-1 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md font-bold`}
                onClick={(e) => {
                  // If not already on orders tab, navigate to it when badge is clicked
                  if (activeTab !== tab.id) {
                    e.stopPropagation(); // Stop propagation to prevent double navigation
                    handleTabClick(e, tab.id);
                  }
                }}
              >
                {orderCount !== undefined ? orderCount : 0}
                {unreadPendingOrders > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-full font-bold animate-pulse shadow-lg ring-2 ring-red-300">
                    {unreadPendingOrders > 99 ? '99+' : unreadPendingOrders}
                  </span>
                )}
              </span>
            )}
            
            {/* Processed Orders tab badge with unread indicators */}
            {tab.id === "processed-orders" && (
              <span 
                className={`relative ${
                  unreadProcessedOrders > 0 
                    ? "bg-red-500 text-white animate-pulse" 
                    : processedOrderCount > 0 ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"
                } text-xs px-2 py-1 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md font-bold`}
                onClick={(e) => {
                  if (activeTab !== tab.id) {
                    e.stopPropagation();
                    handleTabClick(e, tab.id);
                  }
                }}
              >
                {processedOrderCount !== undefined ? processedOrderCount : 0}
                {unreadProcessedOrders > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-full font-bold animate-pulse shadow-lg ring-2 ring-red-300">
                    {unreadProcessedOrders > 99 ? '99+' : unreadProcessedOrders}
                  </span>
                )}
              </span>
            )}
            
            {/* Sent Orders tab badge with unread indicators */}
            {tab.id === "sent-orders" && (
              <span 
                className={`relative ${
                  unreadSentOrders > 0 
                    ? "bg-red-500 text-white animate-pulse" 
                    : sentOrderCount > 0 ? "bg-purple-500 text-white" : "bg-gray-300 text-gray-700"
                } text-xs px-2 py-1 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md font-bold`}
                onClick={(e) => {
                  if (activeTab !== tab.id) {
                    e.stopPropagation();
                    handleTabClick(e, tab.id);
                  }
                }}
              >
                {sentOrderCount !== undefined ? sentOrderCount : 0}
                {unreadSentOrders > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-full font-bold animate-pulse shadow-lg ring-2 ring-red-300">
                    {unreadSentOrders > 99 ? '99+' : unreadSentOrders}
                  </span>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Main App with Authentication and Role-Based Access
function AppContent() {
  const { data: session, status } = useSession() as any;

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect will be handled by middleware
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Database className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Access Required</h3>
          <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
            Please sign in to access the Data Processing Suite
          </p>
        </div>
      </div>
    );
  }

  // ===== ROLE-BASED ACCESS CONTROL =====
  // Convert role to lowercase for case-insensitive comparison
  const userRole = session?.user?.role?.toLowerCase();
  // Enhanced role checking
  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin';
  const isRegularUser = userRole === 'user';
  

  
  // Set initial active tab based on user role
  let defaultTab = "send-order"; // Default for most users
  if (isSuperAdmin || isAdmin) {
    defaultTab = "bundle-allocator";
  }
  
  // Check URL parameters for forced history tab or any other tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const showHistory = urlParams.get('showHistory');
      const forceTab = urlParams.get('forceTab');
      
      // Handle history tab force
      if (showHistory === 'true' && (isSuperAdmin || isAdmin)) {
        setActiveTab('history');
      }
      
      // Handle any tab force
      if (forceTab) {
        setActiveTab(forceTab);
      }
    }
  }, [isSuperAdmin, isAdmin]);
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Bundle Allocator state
  const [allocatorInputText, setAllocatorInputText] = useState("");
  const [allocatorEntries, setAllocatorEntries] = useState<PhoneEntry[]>([]);

  // Bundle Categorizer state
  const [categorizerRawData, setCategorizerRawData] = useState("");
  const [categorizerSummary, setCategorizerSummary] = useState<Array<{ allocation: string, count: number }>>([]);
  const [categorizerChartData, setCategorizerChartData] = useState<Array<{ allocation: string, count: number }>>([]);

  // History state (maintained for all users, but only shown to admins)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [totalDatabaseEntries, setTotalDatabaseEntries] = useState<number>(0);
  const [phoneEntriesCount, setPhoneEntriesCount] = useState<number>(0);
  const [processedOrderEntriesCount, setProcessedOrderEntriesCount] = useState<number>(0);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  // Add to history function - WORKS FOR ALL USERS (both admins and non-admins)
  const addToHistory = async (entries: PhoneEntry[], type: 'bundle-allocator' | 'bundle-categorizer') => {
    const now = getCurrentTimeSync();
    const timestamp = getCurrentTimestampSync();
    const newEntry: HistoryEntry = {
      id: `${type}-${timestamp}`,
      date: getCurrentDateStringSync(),
      timestamp: timestamp,
      entries: entries,
      totalGB: entries.reduce((sum, entry) => sum + entry.allocationGB, 0),
      validCount: entries.filter(entry => entry.isValid && !entry.isDuplicate).length,
      invalidCount: entries.filter(entry => !entry.isValid).length,
      duplicateCount: entries.filter(entry => entry.isDuplicate).length,
      type: type
    };

    // Add to local state first (for admins to see)
    setHistory(prev => [newEntry, ...prev]);

    // Save to database (for ALL users - admins and non-admins)
    try {
      await fetch('/api/history/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      });
    } catch (error) {
      console.error('Failed to save history to database:', error);
    }
  };

  // Load history from database - FOR SUPER ADMINS, ADMINS, AND MANAGERS
  useEffect(() => {
    const loadHistory = async () => {
      if (!isSuperAdmin && !isAdmin) return; // Only load history for authorized users
      
      try {
        const response = await fetch('/api/history/load');
        if (response.ok) {
          const data = await response.json();
          setHistory(data.historyEntries || []);
          
          // Set total entries data
          setTotalDatabaseEntries(data.totalEntries || 0);
          setPhoneEntriesCount(data.phoneEntriesCount || 0);
          setProcessedOrderEntriesCount(data.processedOrderEntriesCount || 0);
          
          console.log('Total database entries:', data.totalEntries);
          console.log('Phone entries count:', data.phoneEntriesCount);
          console.log('Processed order entries count:', data.processedOrderEntriesCount);
        }
      } catch (error) {
        console.error('Failed to load history from database:', error);
      }
    };

    if (session?.user && (isSuperAdmin || isAdmin)) {
      loadHistory();
    }
  }, [session, isSuperAdmin, isAdmin]);

  // ===== CONDITIONAL TABS BASED ON USER ROLE =====
  // Define base tabs available to everyone
  const baseTabs = [
    {
      id: "bundle-allocator",
      name: "Bundle Allocator",
      icon: Phone,
    },
    {
      id: "bundle-categorizer", 
      name: "Bundle Categorizer",
      icon: BarChart,
    },
    {
      id: "send-order",
      name: "Send Order",
      icon: Send,
    },
    {
      id: "orders",
      name: "Orders",
      icon: FileBox,
    },
    {
      id: "processed-orders",
      name: "Processed Orders",
      icon: CheckCircle,
    },
    {
      id: "sent-orders",
      name: "My Sent Orders",
      icon: Send,
    },
    {
      id: "track-orders",
      name: "Track Order Status",
      icon: AlertCircle, // Changed from Eye to AlertCircle
    },
    {
      id: "billing",
      name: "Billing",
      icon: DollarSign,
    },
    {
      id: "accounting",
      name: "Accounting",
      icon: Calculator,
      roles: ["admin", "superadmin"] // Restrict to admin roles
    }
  ];

  // History tab is accessible to super admins and admins
  if (isSuperAdmin || isAdmin) {
    // Insert the history tab at the 7th position (index 6)
    baseTabs.splice(6, 0, {
      id: "history",
      name: "History & Analytics",
      icon: History,
    });
  }
  
  // Filter tabs based on user role
  const filteredTabs = baseTabs.filter(tab => {
    // Special debug for history tab
    // Super admin users have access to all tabs
    if (isSuperAdmin) {
      return true; // Super admins get access to all tabs including history
    }
    
    // Regular users can only access send-order, sent-orders, and billing
    if (isRegularUser) {
      const hasAccess = tab.id === 'send-order' || tab.id === 'sent-orders' || tab.id === 'billing';
      return hasAccess;
    }
    
    // Admin users can access specific tabs, including track-orders and history
    if (isAdmin) {
      const hasAccess = tab.id === 'bundle-allocator' || 
             tab.id === 'bundle-categorizer' || 
             tab.id === 'orders' || 
             tab.id === 'processed-orders' || 
             tab.id === 'track-orders' ||
             tab.id === 'history' ||
             tab.id === 'accounting'; // Explicitly include accounting tab for admins
      return hasAccess;
    }
    
    // Default behavior for other roles
    const defaultAccess = tab.id !== 'history';
    return defaultAccess;
  });
  
  // Safety check is no longer needed as we're now adding the history tab at the beginning of baseTabs for superadmins
  
  // Verify the current tab is allowed for user's role
  const renderActiveComponent = () => {
    // Find the current tab in the filtered tabs (tabs user has access to)
    const currentTab = filteredTabs.find(tab => tab.id === activeTab);
    
    // If the current tab is not in user's allowed tabs, default to the first allowed tab
    if (!currentTab && filteredTabs.length > 0) {
      // User tried to access an unauthorized tab, redirect to default tab
      setActiveTab(filteredTabs[0].id);
      return null;
    }
    
    // Render the appropriate component based on the active tab and user role
    switch (activeTab) {
      case "bundle-allocator":
        // Super admins and admins can access
        if (isSuperAdmin || isAdmin) {
          return (
            <BundleAllocatorApp
              inputText={allocatorInputText}
              setInputText={setAllocatorInputText}
              entries={allocatorEntries}
              setEntries={setAllocatorEntries}
              onAddToHistory={addToHistory}
            />
          );
        }
        break;

      case "bundle-categorizer":
        // Super admins and admins can access
        if (isSuperAdmin || isAdmin) {
          return (
            <BundleCategorizerApp
              rawData={categorizerRawData}
              setRawData={setCategorizerRawData}
              summary={categorizerSummary}
              setSummary={setCategorizerSummary}
              chartData={categorizerChartData}
              setChartData={setCategorizerChartData}
              onAddToHistory={addToHistory}
            />
          );
        }
        break;
        
      case "send-order":
        // Super admins and users can access
        if (isSuperAdmin || isRegularUser) {
          return <SendOrderApp />;
        }
        break;
        
      case "orders":
        // Super admins and admins can access
        if (isSuperAdmin || isAdmin) {
          return <OrdersApp />;
        }
        break;
        
      case "processed-orders":
        // Super admins and admins can access
        if (isSuperAdmin || isAdmin) {
          return <ProcessedOrdersApp />;
        }
        break;
        
      case "sent-orders":
        // Super admins and users can access
        if (isSuperAdmin || isRegularUser) {
          return <SentOrdersApp />;
        }
        break;
        
      case "track-orders":
        // Track orders tab is accessible to super admins and admins
        if (isSuperAdmin || isAdmin) {
          return <OrderTrackingApp />;
        }
        break;
        
      case "history":
        // History tab is accessible to super admins and admins
        
        // Always render history tab if the user is a superadmin
        if (session?.user?.role?.toLowerCase() === 'superadmin') {
          return (
            <HistoryManager
              history={history}
              setHistory={setHistory}
              isSuperAdmin={true}
              totalDatabaseEntries={totalDatabaseEntries}
              phoneEntriesCount={phoneEntriesCount}
              processedOrderEntriesCount={processedOrderEntriesCount}
            />
          );
        }
        // Also render for admin
        else if (isSuperAdmin || isAdmin) {
          return (
            <HistoryManager
              history={history}
              setHistory={setHistory}
              isSuperAdmin={false}
              totalDatabaseEntries={totalDatabaseEntries}
              phoneEntriesCount={phoneEntriesCount}
              processedOrderEntriesCount={processedOrderEntriesCount}
            />
          );
        }
        break;
        
      case "billing":
        // Billing tab is accessible to super admins, regular users and managers
        if (isSuperAdmin || isRegularUser) {
          return <BillingApp />;
        }
        break;
        
      case "accounting":
        // Accounting tab is only accessible to admins and super admins
        if (isSuperAdmin || isAdmin) {
          return <AccountingApp tabActive={true} />;
        }
        break;
    }
    
    // If we reach here, the user doesn't have permission to view the selected tab
    // Redirect to the first allowed tab
    if (filteredTabs.length > 0 && filteredTabs[0].id !== activeTab) {
      setActiveTab(filteredTabs[0].id);
    }
    
    return null;
  };

  // This disables URL-based navigation for tabs
  useEffect(() => {
    // Handle any browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      // This prevents the browser from doing URL-based navigation
      // and keeps us in the current app state
      event.preventDefault();
      event.stopPropagation();
      
      // We won't change the active tab based on URL changes
      // This ensures tab state is only controlled by our click handlers
      return false;
    };

    // Add event listener for browser history changes
    window.addEventListener('popstate', handlePopState);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  
  // Client-side effect to handle initial URL
  useEffect(() => {
    // Only run in the browser
    if (typeof window !== 'undefined') {
      const initialPath = window.location.pathname.substring(1);
      
      // Check if the path matches a tab
      const matchingTab = filteredTabs.find((tab) => tab.id === initialPath);
      
      if (matchingTab) {
        setActiveTab(matchingTab.id);
      }
    }
  }, [filteredTabs]);
  
  // Safe tab switching handler that prevents any navigation side effects
  const safeTabSwitch = useCallback((tabId: string) => {
    // Directly set the active tab without any URL or history manipulation
    setActiveTab(tabId);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with Tabs - Mobile Optimized */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex flex-col gap-3 py-3 sm:py-4">
            {/* Title and User Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-h-[60px] sm:min-h-[40px]">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Data Processing Suite V1.0</h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Order management and processing tool</p>
                </div>
              </div>

              {/* User Info & Stats - Mobile Optimized */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm w-full sm:w-auto justify-end sm:justify-start">
                {/* Show history stats for authorized users */}
                {(isSuperAdmin || isAdmin) && history.length > 0 && activeTab !== "history" && (
                  <>
                    <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full font-medium">
                      {history.length} sessions
                    </div>
                    <div className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full font-medium">
                      {history.reduce((sum, entry) => {
                        // Parse totalGB as a number first, or use 0 if it can't be parsed
                        const entryGB = typeof entry.totalGB === 'number' 
                          ? entry.totalGB 
                          : typeof entry.totalGB === 'string'
                            ? parseFloat(entry.totalGB) || 0
                            : 0;
                        return sum + entryGB;
                      }, 0).toFixed(1)} GB total
                    </div>
                  </>
                )}

                {/* Superadmin Controls - Keep on same line */}
                {isSuperAdmin && (
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <a
                      href="/admin"
                      className="flex items-center gap-1 sm:gap-2 bg-purple-100 text-purple-700 px-2 sm:px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                      onClick={(e) => {
                        // Admin panel is an exception - this should navigate
                      }}
                    >
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Admin Panel</span>
                      <span className="sm:hidden">Admin</span>
                    </a>
                    <a
                      href="/test-notifications"
                      className="flex items-center gap-1 sm:gap-2 bg-orange-100 text-orange-700 px-2 sm:px-3 py-1 rounded-full hover:bg-orange-200 transition-colors"
                      onClick={(e) => {
                        // Test page is an exception - this should navigate
                      }}
                    >
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Test Notifications</span>
                      <span className="sm:hidden">Test</span>
                    </a>
                    {/* User Menu - Integrated with Superadmin controls */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="font-medium text-xs sm:text-sm truncate max-w-20 sm:max-w-none">
                        {session?.user?.name || session?.user?.email}
                      </span>
                      <span className="text-xs bg-red-200 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">Super Admin</span>
                      <button
                        onClick={handleSignOut}
                        className="ml-1 sm:ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        title="Sign out"
                      >
                        <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* User Menu - For non-superadmin users */}
                {!isSuperAdmin && (
                  <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full flex-1 sm:flex-initial">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="font-medium text-xs sm:text-sm truncate max-w-24 sm:max-w-none">
                      {session?.user?.name || session?.user?.email}
                    </span>
                    {/* Show role indicator for all users */}
                    {session?.user?.role === 'admin' ? (
                      <span className="text-xs bg-purple-200 text-purple-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">Admin</span>
                    ) : session?.user?.role === 'user' ? (
                      <span className="text-xs bg-blue-200 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">User</span>
                    ) : (
                      <span className="text-xs bg-green-200 text-green-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">Manager</span>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="ml-1 sm:ml-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      title="Sign out"
                    >
                      <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Dark Mode Toggle */}
              <div className="flex justify-center sm:justify-end mt-4 sm:mt-2">
                <DarkModeToggle />
              </div>
            </div>

            {/* Tab Navigation - Mobile Friendly */}
            <TabNavigation 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              tabs={filteredTabs} 
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              history={history} 
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content pt-4 pb-8">
        {renderActiveComponent()}


      </div>
    </div>
  );
}

// Import our AppWithProviders component
import AppWithProviders from './AppWithProviders';

// Export the main page component, wrapped with AppWithProviders
export default function Home() {
  return (
    <AppWithProviders>
      <AppContent />
    </AppWithProviders>
  );
}
