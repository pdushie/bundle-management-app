// Create a history viewing component that displays order processing history
import React, { useState, useEffect } from "react";
import { getHistoryEntries, getPhoneEntriesForHistory } from "../lib/historyClient";
import { Clock, Search, Info, Database, Phone, Check, X, AlertTriangle, ChevronDown, ChevronUp, Loader, Filter } from "lucide-react";

// Define the types locally as well for clarity
type HistoryEntry = {
  id: string;
  date: string; // This is a string in the database schema
  timestamp: number;
  totalGB: string | null;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  type: string;
  userId: string | null;
  createdAt: Date | null;
};

type PhoneEntry = {
  id: number;
  historyEntryId: string | null;
  number: string;
  allocationGB: string | null;
  isValid: boolean;
  isDuplicate: boolean;
  createdAt: Date | null;
};

export default function HistoryViewer() {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [phoneEntries, setPhoneEntries] = useState<PhoneEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingPhones, setIsLoadingPhones] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // Load history entries on component mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const entries = await getHistoryEntries();
        setHistoryEntries(entries);
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  // Load phone entries when a history entry is selected
  const handleHistorySelect = async (historyId: string) => {
    if (selectedHistory === historyId) {
      setSelectedHistory(null);
      setPhoneEntries([]);
      return;
    }

    setSelectedHistory(historyId);
    setIsLoadingPhones(true);
    
    try {
      const entries = await getPhoneEntriesForHistory(historyId);
      setPhoneEntries(entries);
    } catch (error) {
      console.error("Failed to load phone entries:", error);
    } finally {
      setIsLoadingPhones(false);
    }
  };

  // Filter history entries based on search term and type filter
  const filteredHistory = historyEntries.filter(entry => {
    const matchesSearch = searchTerm === "" || 
      entry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.userId && entry.userId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === "all" || entry.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  // Handle page navigation
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePageChange = (pageNumber: number) => {
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(page);
  };

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* History Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4 sm:mb-6">
          <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span>Order Processing History</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              View detailed history of processed orders and phone numbers
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="order_processed">Order Processed</option>
              </select>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ml-2 text-gray-600">Loading history...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="h-8 w-8 text-gray-400 mb-3" />
                <p className="text-gray-500">No history entries found</p>
                {searchTerm || typeFilter !== "all" ? (
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                ) : null}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Data & Numbers
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Stats
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(entry.timestamp)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {entry.id.substring(0, 10)}...
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {entry.type === "order_processed" ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Order Processed
                              </>
                            ) : (
                              entry.type
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="mr-2">
                              <Database className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {entry.totalGB ? (
                                  parseFloat(entry.totalGB) > 1023 ? 
                                    `${(parseFloat(entry.totalGB) / 1024).toFixed(2)} TB` : 
                                    `${parseFloat(entry.totalGB).toFixed(2)} GB`
                                ) : "0 GB"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {entry.totalGB ? (parseFloat(entry.totalGB) * 1024).toLocaleString() : "0"} MB
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center">
                              <Check className="h-3 w-3 text-green-500 mr-1" />
                              <span>Valid: {entry.validCount}</span>
                            </div>
                            <div className="flex items-center mt-1">
                              <X className="h-3 w-3 text-red-500 mr-1" />
                              <span>Invalid: {entry.invalidCount}</span>
                            </div>
                            <div className="flex items-center mt-1">
                              <AlertTriangle className="h-3 w-3 text-orange-500 mr-1" />
                              <span>Duplicates: {entry.duplicateCount}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleHistorySelect(entry.id)}
                            className="inline-flex items-center px-2 py-1 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          >
                            {selectedHistory === entry.id ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                View Details
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {selectedHistory === entry.id && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 bg-gray-50">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <h4 className="font-medium text-gray-900 mb-2">Phone Numbers</h4>
                              {isLoadingPhones ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader className="h-5 w-5 text-blue-500 animate-spin mr-2" />
                                  <span>Loading phone numbers...</span>
                                </div>
                              ) : phoneEntries.length === 0 ? (
                                <div className="text-sm text-gray-500 text-center py-4">
                                  No phone entries found for this history record.
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-96">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Number
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Data
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                      {phoneEntries.map((phone) => (
                                        <tr key={phone.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex items-center">
                                              <Phone className="h-3 w-3 text-gray-500 mr-2" />
                                              <span className="text-sm font-medium text-gray-900">
                                                {phone.number}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                              {phone.allocationGB ? (
                                                parseFloat(phone.allocationGB) > 1023 ? 
                                                  `${(parseFloat(phone.allocationGB) / 1024).toFixed(2)} TB` : 
                                                  `${parseFloat(phone.allocationGB).toFixed(2)} GB`
                                              ) : "0 GB"}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {phone.allocationGB ? (parseFloat(phone.allocationGB) * 1024).toLocaleString() : "0"} MB
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            {phone.isDuplicate ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Duplicate
                                              </span>
                                            ) : phone.isValid ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                <Check className="h-3 w-3 mr-1" />
                                                Valid
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                <X className="h-3 w-3 mr-1" />
                                                Invalid
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {!isLoading && filteredHistory.length > 0 && (
          <div className="mt-4 sm:mt-6 flex justify-between items-center">
            {/* Page count info */}
            <div className="text-xs text-gray-500">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredHistory.length)} of {filteredHistory.length} entries
            </div>
            
            {/* Pagination */}
            {filteredHistory.length > itemsPerPage && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-1 rounded border ${currentPage === 1 ? "text-gray-300 border-gray-200" : "text-blue-600 border-blue-300 hover:bg-blue-50"}`}
                  >
                    <span className="sr-only">First page</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`p-1 rounded border ${currentPage === 1 ? "text-gray-300 border-gray-200" : "text-blue-600 border-blue-300 hover:bg-blue-50"}`}
                  >
                    <span className="sr-only">Previous page</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <input 
                      type="number" 
                      min="1" 
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value && !isNaN(value)) {
                          handlePageChange(value);
                        }
                      }}
                      className="w-14 h-8 text-center border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-600">of {totalPages}</span>
                    <button
                      onClick={() => {
                        const pageInput = document.querySelector("input[type='number']") as HTMLInputElement;
                        const value = parseInt(pageInput.value);
                        if (value && !isNaN(value)) {
                          handlePageChange(value);
                        }
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Go
                    </button>
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded border ${currentPage === totalPages ? "text-gray-300 border-gray-200" : "text-blue-600 border-blue-300 hover:bg-blue-50"}`}
                  >
                    <span className="sr-only">Next page</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded border ${currentPage === totalPages ? "text-gray-300 border-gray-200" : "text-blue-600 border-blue-300 hover:bg-blue-50"}`}
                  >
                    <span className="sr-only">Last page</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
