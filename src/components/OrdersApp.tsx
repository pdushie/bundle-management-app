"use client";

import React, { useState, useEffect } from "react";
import { Download, Clock, FileText, User, Database, CheckCircle, XCircle, Loader, Search, SlidersHorizontal, Check, CheckSquare, Square, Archive, DollarSign } from "lucide-react";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { getPendingOrdersOldestFirst, getOrdersOldestFirst, saveOrders, updateOrder } from "../lib/orderClient";
import { useOrderCount } from "../lib/orderContext";
import { ORDER_UPDATED_EVENT, notifyOrderProcessed, notifyCountUpdated } from "../lib/orderNotifications";

  // Define the Order type to represent an order in the queue
type OrderEntryStatus = "pending" | "sent" | "error";

type Order = {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  orderCost?: number;
  estimatedCost?: number;
  status: "pending" | "processed";
  entries: Array<{
    number: string;
    allocationGB: number;
    status?: OrderEntryStatus;
    cost?: number | null;
  }>;
  isSelected?: boolean;
};export default function OrdersApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "processed">("all");
  const [sortField, setSortField] = useState<"date" | "userName" | "totalData" | "totalCount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Changed to "asc" so oldest orders appear at the top
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(25);
  
  // Get the refreshOrderCount function from context
  const { refreshOrderCount } = useOrderCount();

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      // Try to load ALL orders from database
      const allOrders = await getOrdersOldestFirst();
      setOrders(allOrders);
      refreshOrderCount(); // Update order counts in the context
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling for real-time updates
  useEffect(() => {
    console.log('OrdersApp: Setting up event listeners');
    
    // Fetch orders immediately
    fetchOrders();
    
    // Set up event listener for order updates
    const handleOrderUpdate = () => {
      console.log('OrdersApp: ORDER_UPDATED_EVENT received');
      fetchOrders();
    };
    
    // Create a more specific handler for order processed events
    const handleOrderProcessed = () => {
      console.log('OrdersApp: ORDER_PROCESSED_EVENT received');
      fetchOrders();
      // Force a count update notification
      notifyCountUpdated();
    };
    
    // Add event listeners for all relevant events
    window.addEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    
    // Set up polling interval with a much longer interval (2 minutes)
    // This reduces bandwidth usage and compute hours while still keeping data reasonably fresh
    const intervalId = setInterval(() => {
      console.log('OrdersApp: Low-frequency polling triggered');
      fetchOrders();
    }, 120000); // 2 minutes
    
    // Clean up
    return () => {
      window.removeEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
      clearInterval(intervalId);
    };
  }, []);
  
  // Load orders from database but don't generate mock data
  useEffect(() => {
    let isMounted = true;
    
    const loadOrders = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        // Try to load ALL orders from database first, not just pending ones
        const allOrders = await getOrdersOldestFirst();
        
        if (!isMounted) return;
        
        // Always just use whatever orders are in the database, even if empty
        setOrders(allOrders);
        
        // Refresh the order count in the context only once after loading orders
        // Not in the dependency array to avoid infinite loops
        if (isMounted) {
          refreshOrderCount();
        }
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadOrders();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once

  // Handle toggle select all
  const handleToggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    // Update all filtered orders
    const updatedOrders = orders.map(order => {
      // Only update orders that are in the current filtered view
      if (isOrderInFilteredView(order)) {
        return { ...order, isSelected: newSelectAll };
      }
      return order;
    });
    
    setOrders(updatedOrders);
    
    // Update selected IDs
    if (newSelectAll) {
      setSelectedOrderIds(allFilteredOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };
  
  // Check if an order should be in the current filtered view
  const isOrderInFilteredView = (order: Order): boolean => {
    // Status filtering is now handled separately before calling this function
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.userName.toLowerCase().includes(searchLower) ||
        order.userEmail.toLowerCase().includes(searchLower) ||
        order.date.includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  };
  
  // Toggle selection for a single order
  const toggleOrderSelection = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, isSelected: !order.isSelected };
      }
      return order;
    });
    
    setOrders(updatedOrders);
    
    // Update the selected IDs list
    const orderToToggle = orders.find(o => o.id === orderId);
    if (orderToToggle) {
      if (orderToToggle.isSelected) {
        // It was previously selected, so we're removing it
        setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
      } else {
        // It was previously unselected, so we're adding it
        setSelectedOrderIds(prev => [...prev, orderId]);
      }
    }
    
    // Update selectAll state
    const newSelectedCount = updatedOrders.filter(o => o.isSelected).length;
    const filteredCount = allFilteredOrders.length;
    setSelectAll(newSelectedCount > 0 && newSelectedCount === filteredCount);
  };
  
  // Filter out processed orders for the orders queue (only show pending ones), 
  // then apply any other filters and sort
  // Apply filters and sorting to all orders
  const allFilteredOrders = orders
    .filter(order => statusFilter === "all" ? order.status === "pending" : order.status === statusFilter)
    .filter(isOrderInFilteredView)
    .sort((a, b) => {
      // Apply sorting
      if (sortField === "date") {
        // Default sort is now oldest first (ascending by timestamp)
        return sortDirection === "asc" 
          ? a.timestamp - b.timestamp  // Oldest first
          : b.timestamp - a.timestamp; // Newest first
      }
      else if (sortField === "userName") {
        return sortDirection === "asc"
          ? a.userName.localeCompare(b.userName)
          : b.userName.localeCompare(a.userName);
      }
      else if (sortField === "totalData") {
        return sortDirection === "asc"
          ? a.totalData - b.totalData
          : b.totalData - a.totalData;
      }
      else if (sortField === "totalCount") {
        return sortDirection === "asc"
          ? a.totalCount - b.totalCount
          : b.totalCount - a.totalCount;
      }
      return 0;
    });
    
  // Calculate pagination indexes
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  // Calculate total pages
  const totalPages = Math.ceil(allFilteredOrders.length / itemsPerPage);
  
  // Get current page items
  const currentItems = allFilteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  
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

  // Toggle sort direction when clicking the same field
  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Download order as Excel file
  const downloadOrder = async (order: Order) => {
    // Check if we need to split the file (1.5 TB = 1,536 GB)
    const MAX_DATA_GB = 1536; // 1.5 TB in GB
    
    // For a single order, check if it exceeds the threshold
    if (order.totalData > MAX_DATA_GB) {
      console.log(`Order ${order.id} exceeds 1.5 TB threshold (${order.totalData} GB). Splitting into multiple files.`);
      // Use the splitting function and return a zip file
      const result = await splitAndZipLargeOrderData([order], MAX_DATA_GB);
      return { 
        buffer: result.buffer, 
        isZip: true
      };
    }
    
    // Otherwise create a regular Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PhoneData");
    
    // Add required header columns exactly as specified
    worksheet.addRow([
      "Beneficiary Msisdn",
      "Beneficiary Name", 
      "Voice(Minutes)",
      "Data (MB) (1024MB = 1GB)",
      "Sms(Unit)"
    ]);
    
    const headerRow = worksheet.lastRow!;
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });
    
    // Add entries with the specified format and default values
    order.entries.forEach(entry => {
      // Convert GB to MB for the Data column
      const dataMB = Math.round(entry.allocationGB * 1024);
      
      const row = worksheet.addRow([
        entry.number,      // Beneficiary Msisdn
        "",                // Beneficiary Name (empty)
        0,                 // Voice(Minutes) - default 0
        dataMB,            // Data (MB)
        0                  // Sms(Unit) - default 0
      ]);
      
      // Color code based on status
      if (entry.status === "error") {
        row.getCell(1).font = { color: { argb: "FFFF0000" } }; // Red for MSISDN with error
      }
    });
    
    // Add an empty row after the entries
    worksheet.addRow([]);
    
    // Calculate the last row number and add summary row in column F
    const lastRowNum = worksheet.rowCount;
    const totalDataRow = worksheet.getRow(lastRowNum);
    
    // Add number count summary in cell F
    totalDataRow.getCell(6).value = `Total Numbers: ${order.entries.length}`;
    totalDataRow.getCell(6).font = { bold: true };
    
    // Add total data allocation in cell F on the next row
    const totalDataMB = Math.round(order.totalData * 1024);
    const totalGBRow = worksheet.getRow(lastRowNum + 1);
    
    // Display in TB if total exceeds 1023 GB
    if (order.totalData > 1023) {
      const totalTB = order.totalData / 1024;
      totalGBRow.getCell(6).value = `Total Data: ${totalDataMB} MB (${totalTB.toFixed(2)} TB)`;
    } else {
      totalGBRow.getCell(6).value = `Total Data: ${totalDataMB} MB (${order.totalData.toFixed(2)} GB)`;
    }
    totalGBRow.getCell(6).font = { bold: true };
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = maxLength + 2;
      }
    });
    
    // Set specific widths for standard columns
    if (worksheet.columnCount >= 5) {
      // Ensure Beneficiary Msisdn column has enough width
      worksheet.getColumn(1).width = Math.max(worksheet.getColumn(1).width || 15, 20);
      // Ensure Beneficiary Name column has enough width
      worksheet.getColumn(2).width = Math.max(worksheet.getColumn(2).width || 15, 25);
      // Ensure Data column has enough width for the header
      worksheet.getColumn(4).width = Math.max(worksheet.getColumn(4).width || 15, 30);
    }
    
    // No summary sheet with order metadata - removing this section as requested
    
    // Set PhoneData as the active sheet when opening the file
    // ExcelJS requires all these properties for a WorkbookView
    workbook.views = [
      { 
        x: 0,
        y: 0,
        width: 10000,
        height: 20000,
        firstSheet: 0,
        activeTab: 0,
        visibility: 'visible'
      }
    ];
    
    // Generate and return the buffer 
    const buffer = await workbook.xlsx.writeBuffer();
    
    return { buffer, isZip: false };
  };
  
  // Download a single order directly and mark it as processed
  const downloadSingleOrder = async (order: Order) => {
    try {
      const { buffer, isZip } = await downloadOrder(order);
      
      // Set the appropriate MIME type based on whether it's a ZIP or Excel file
      const mimeType = isZip 
        ? "application/zip"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      
      const blob = new Blob([buffer], { type: mimeType });
      
      // Generate human-friendly date and time format
      const downloadDate = new Date();
      const formattedDate = downloadDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).replace(/,/g, '');
      const formattedTime = downloadDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/:/g, '-').replace(/\s/g, '');
      
      // Create filename with the new format
      const filename = isZip
        ? `UploadTemplate_${formattedDate}_${formattedTime}.zip`
        : `UploadTemplate_${formattedDate}_${formattedTime}.xlsx`;
        
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      // Show message if order was split due to size
      if (isZip) {
        alert(`Order data allocation (${order.totalData.toFixed(2)} GB) exceeds 1.5 TB. The data has been split into multiple Excel files and zipped for download.`);
      }
      
      // Get current date and time for processing timestamp
      const now = new Date();
      const processedDate = now.toISOString().split('T')[0];
      const processedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Update the order status to "processed" after downloading and update timestamp
      const updatedOrder = { 
        ...order, 
        status: "processed" as const,
        timestamp: now.getTime(),
        date: processedDate,
        time: processedTime
      };
      
      // Update the local state
      const updatedOrders = orders.map(o => o.id === order.id ? updatedOrder : o);
      setOrders(updatedOrders);
      
      // Update in database
      await updateOrder(updatedOrder);
      
      // Notify that the order has been processed
      notifyOrderProcessed(order.id);
      
      // Force a count update notification to update badges immediately
      notifyCountUpdated();
      
      // Refresh the order counts to update badges
      refreshOrderCount();
      
    } catch (error) {
      console.error("Error downloading order:", error);
      alert("Failed to download order. Please try again.");
    }
  };
  
  // Merge multiple orders into a single Excel file
  const mergeOrdersToSingleExcel = async (ordersToMerge: Order[]) => {
    try {
      // Calculate total data allocation before processing
      let totalDataGB = 0;
      for (const order of ordersToMerge) {
        totalDataGB += order.totalData;
      }
      
      console.log(`Total data allocation: ${totalDataGB.toFixed(2)} GB`);
      
      // Check if we need to split files (1.5 TB = 1,536 GB)
      const MAX_DATA_GB = 1536; // 1.5 TB in GB
      
      // If total data is over 1.5 TB, we need to split and return a zip file
      if (totalDataGB > MAX_DATA_GB) {
        console.log(`Total data (${totalDataGB.toFixed(2)} GB) exceeds ${MAX_DATA_GB} GB (1.5 TB). Splitting into multiple files.`);
        return await splitAndZipLargeOrderData(ordersToMerge, MAX_DATA_GB);
      }
      
      // If under the limit, create a single Excel file as normal
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("PhoneData");
      
      // Add header columns
      worksheet.addRow([
        "Beneficiary Msisdn",
        "Beneficiary Name", 
        "Voice(Minutes)",
        "Data (MB) (1024MB = 1GB)",
        "Sms(Unit)"
      ]);
      
      // Format header row
      const headerRow = worksheet.lastRow!;
      headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
      
      // Accumulate all entries from all orders
      let totalEntries = 0;
      let totalDataMB = 0;
      
      for (const order of ordersToMerge) {
        // Add entries for this order directly without the order info header
        order.entries.forEach(entry => {
          // Convert GB to MB for the Data column
          const dataMB = Math.round(entry.allocationGB * 1024);
          totalDataMB += dataMB;
          
          const row = worksheet.addRow([
            entry.number,      // Beneficiary Msisdn
            "",                // Beneficiary Name (empty)
            0,                 // Voice(Minutes) - default 0
            dataMB,            // Data (MB)
            0                  // Sms(Unit) - default 0
          ]);
          
          // Color code based on status
          if (entry.status === "error") {
            row.getCell(1).font = { color: { argb: "FFFF0000" } }; // Red for MSISDN with error
          }
        });
        
        totalEntries += order.entries.length;
      }
      
      // Add an empty row after all entries
      worksheet.addRow([]);
      
      // Add summary information
      const lastRowNum = worksheet.rowCount;
      const totalDataRow = worksheet.getRow(lastRowNum);
      
      // Add number count summary in cell F
      totalDataRow.getCell(6).value = `Total Numbers: ${totalEntries}`;
      totalDataRow.getCell(6).font = { bold: true };
      
      // Add total data allocation in cell F on the next row
      const totalGBRow = worksheet.getRow(lastRowNum + 1);
      const totalGB = totalDataMB / 1024;
      
      // Display in TB if total exceeds 1023 GB
      if (totalGB > 1023) {
        const totalTB = totalGB / 1024;
        totalGBRow.getCell(6).value = `Total Data: ${totalDataMB} MB (${totalTB.toFixed(2)} TB)`;
      } else {
        totalGBRow.getCell(6).value = `Total Data: ${totalDataMB} MB (${totalGB.toFixed(2)} GB)`;
      }
      totalGBRow.getCell(6).font = { bold: true };
      
      // Auto-size columns
      worksheet.columns.forEach(column => {
        if (column && typeof column.eachCell === 'function') {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const length = cell.value ? cell.value.toString().length : 10;
            if (length > maxLength) {
              maxLength = length;
            }
          });
          column.width = maxLength + 2;
        }
      });
      
      // Set specific widths for standard columns
      if (worksheet.columnCount >= 5) {
        // Ensure Beneficiary Msisdn column has enough width
        worksheet.getColumn(1).width = Math.max(worksheet.getColumn(1).width || 15, 20);
        // Ensure Beneficiary Name column has enough width
        worksheet.getColumn(2).width = Math.max(worksheet.getColumn(2).width || 15, 25);
        // Ensure Data column has enough width for the header
        worksheet.getColumn(4).width = Math.max(worksheet.getColumn(4).width || 15, 30);
      }
      
      // No summary sheet with order metadata - removing this section as requested
      
      // Set PhoneData as the active sheet when opening the file
      workbook.views = [
        { 
          x: 0,
          y: 0,
          width: 10000,
          height: 20000,
          firstSheet: 0,
          activeTab: 0,
          visibility: 'visible'
        }
      ];
      
      // Generate the workbook buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return { buffer, isZip: false };
    } catch (error) {
      console.error("Error merging orders:", error);
      throw error;
    }
  };
  
  // Helper function to split large order data and create a zip file
  const splitAndZipLargeOrderData = async (orders: Order[], maxDataGB: number): Promise<{ buffer: ArrayBuffer, isZip: boolean }> => {
    try {
      const zip = new JSZip();
      let currentBatchData = 0;
      let currentBatchEntries: Array<{ order: Order, entry: any }> = [];
      let batchNumber = 1;
      
      // Flatten all entries from all orders with their parent order reference
      const allEntries = orders.flatMap(order => 
        order.entries.map(entry => ({ order, entry }))
      );
      
      // Process entries in batches
      for (const { order, entry } of allEntries) {
        // If adding this entry would exceed the batch limit, create a file and start a new batch
        if (currentBatchData + entry.allocationGB > maxDataGB && currentBatchEntries.length > 0) {
          const batchBuffer = await createExcelFileFromBatch(currentBatchEntries, batchNumber);
          
          // Generate human-friendly date and time format
          const batchDate = new Date();
          const formattedDate = batchDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }).replace(/,/g, '');
          const formattedTime = batchDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/:/g, '-').replace(/\s/g, '');
          
          zip.file(`UploadTemplate_Batch${batchNumber}_${formattedDate}_${formattedTime}.xlsx`, batchBuffer);
          
          console.log(`Created batch ${batchNumber} with ${currentBatchEntries.length} entries and ${currentBatchData.toFixed(2)} GB`);
          
          // Reset for next batch
          currentBatchEntries = [];
          currentBatchData = 0;
          batchNumber++;
        }
        
        // Add entry to current batch
        currentBatchEntries.push({ order, entry });
        currentBatchData += entry.allocationGB;
      }
      
      // Create final batch if there are remaining entries
      if (currentBatchEntries.length > 0) {
        const batchBuffer = await createExcelFileFromBatch(currentBatchEntries, batchNumber);
        
        // Generate human-friendly date and time format
        const batchDate = new Date();
        const formattedDate = batchDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).replace(/,/g, '');
        const formattedTime = batchDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/:/g, '-').replace(/\s/g, '');
        
        zip.file(`UploadTemplate_Batch${batchNumber}_${formattedDate}_${formattedTime}.xlsx`, batchBuffer);
        
        console.log(`Created final batch ${batchNumber} with ${currentBatchEntries.length} entries and ${currentBatchData.toFixed(2)} GB`);
      }
      
      // No README file as requested
      
      // Generate the zip file
      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
      return { buffer: zipBuffer, isZip: true };
    } catch (error) {
      console.error("Error splitting and zipping large orders:", error);
      throw error;
    }
  };
  
  // Helper function to create an Excel file from a batch of entries
  const createExcelFileFromBatch = async (batchEntries: Array<{ order: Order, entry: any }>, batchNumber: number) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PhoneData");
    
    // Add header columns
    worksheet.addRow([
      "Beneficiary Msisdn",
      "Beneficiary Name", 
      "Voice(Minutes)",
      "Data (MB) (1024MB = 1GB)",
      "Sms(Unit)"
    ]);
    
    // Format header row
    const headerRow = worksheet.lastRow!;
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });
    
    // Add entries
    let totalEntries = 0;
    let totalDataMB = 0;
    
    batchEntries.forEach(({ entry }) => {
      // Convert GB to MB for the Data column
      const dataMB = Math.round(entry.allocationGB * 1024);
      totalDataMB += dataMB;
      
      const row = worksheet.addRow([
        entry.number,      // Beneficiary Msisdn
        "",                // Beneficiary Name (empty)
        0,                 // Voice(Minutes) - default 0
        dataMB,            // Data (MB)
        0                  // Sms(Unit) - default 0
      ]);
      
      // Color code based on status
      if (entry.status === "error") {
        row.getCell(1).font = { color: { argb: "FFFF0000" } }; // Red for MSISDN with error
      }
      
      totalEntries++;
    });
    
    // Add an empty row after all entries
    worksheet.addRow([]);
    
    // Add summary information
    const lastRowNum = worksheet.rowCount;
    const totalDataRow = worksheet.getRow(lastRowNum);
    
    // Add number count summary in cell F
    totalDataRow.getCell(6).value = `Total Numbers: ${totalEntries}`;
    totalDataRow.getCell(6).font = { bold: true };
    
    // Add total data allocation in cell F on the next row
    const totalGBRow = worksheet.getRow(lastRowNum + 1);
    const totalGB = totalDataMB / 1024;
    
    // Display in TB if total exceeds 1023 GB
    if (totalGB > 1023) {
      const totalTB = totalGB / 1024;
      totalGBRow.getCell(6).value = `Total Data: ${totalDataMB} MB (${totalTB.toFixed(2)} TB)`;
    } else {
      totalGBRow.getCell(6).value = `Total Data: ${totalDataMB} MB (${totalGB.toFixed(2)} GB)`;
    }
    totalGBRow.getCell(6).font = { bold: true };
    
    // Add batch information
    const batchInfoRow = worksheet.getRow(lastRowNum + 2);
    batchInfoRow.getCell(6).value = `Batch: ${batchNumber}`;
    batchInfoRow.getCell(6).font = { bold: true };
    
    // Auto-size columns
    worksheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = maxLength + 2;
      }
    });
    
    // Set specific widths for standard columns
    if (worksheet.columnCount >= 5) {
      worksheet.getColumn(1).width = Math.max(worksheet.getColumn(1).width || 15, 20); // MSISDN
      worksheet.getColumn(2).width = Math.max(worksheet.getColumn(2).width || 15, 25); // Name
      worksheet.getColumn(4).width = Math.max(worksheet.getColumn(4).width || 15, 30); // Data
    }
    
    // Generate and return the buffer
    return await workbook.xlsx.writeBuffer();
  };
  
  // Download selected orders as a merged Excel file or ZIP file
  const downloadSelectedOrders = async () => {
    if (selectedOrderIds.length === 0) {
      alert("Please select at least one order to download.");
      return;
    }
    
    try {
      // Show loading state
      setIsLoading(true);
      
      // If only one order is selected, download directly
      if (selectedOrderIds.length === 1) {
        const order = orders.find(o => o.id === selectedOrderIds[0]);
        if (order) {
          await downloadSingleOrder(order);
          setIsLoading(false);
        }
        return;
      }
      
      // Get all selected orders
      const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));
      
      // If selectAll is true or all filtered orders are selected, merge into one file
      const allFilteredOrdersSelected = 
        selectAll || 
        (selectedOrderIds.length === allFilteredOrders.length && selectedOrderIds.length > 1);
        
      if (allFilteredOrdersSelected) {
        // Merge all selected orders into a single Excel file or zip file if too large
        const result = await mergeOrdersToSingleExcel(selectedOrders);
        
        // Calculate total data allocation for the message
        const totalDataAllocation = selectedOrders.reduce((sum, order) => sum + order.totalData, 0);
        
        // Create download link based on result type
        // Generate human-friendly date and time format
        const fileDate = new Date();
        const formattedDate = fileDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).replace(/,/g, '');
        const formattedTime = fileDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/:/g, '-').replace(/\s/g, '');

        if (result.isZip) {
          // If result is a zip file (for large data > 1.5TB)
          const blob = new Blob([result.buffer], {
            type: "application/zip",
          });
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `UploadTemplate_${formattedDate}_${formattedTime}.zip`;
          link.click();
          URL.revokeObjectURL(url);
          
          // Show a more informative message for split files
          alert(`Total data allocation (${totalDataAllocation.toFixed(2)} GB) exceeds 1.5 TB. The data has been split into multiple Excel files and zipped for download.`);
        } else {
          // If result is a regular Excel file (for data ≤ 1.5TB)
          const blob = new Blob([result.buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `UploadTemplate_${formattedDate}_${formattedTime}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
          
          alert(`Successfully merged and downloaded ${selectedOrders.length} orders into a single file.`);
        }
        
        // Get current date and time for processing timestamp
        const now = new Date();
        const processedDate = now.toISOString().split('T')[0];
        const processedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Mark all selected orders as processed with updated timestamps
        const updatedOrders = orders.map(order => 
          selectedOrderIds.includes(order.id) 
            ? { 
                ...order, 
                status: "processed" as const,
                timestamp: now.getTime(),
                date: processedDate,
                time: processedTime
              } 
            : order
        );
        
        setOrders(updatedOrders);
        
        // Update each order in the database
        const updatePromises = updatedOrders
          .filter(order => selectedOrderIds.includes(order.id))
          .map(order => updateOrder(order));
        
        await Promise.all(updatePromises);
        
        // Notify that orders have been processed using our notification system
        console.log("OrdersApp: Notifying that orders have been processed");
        selectedOrderIds.forEach(orderId => {
          notifyOrderProcessed(orderId); // Dispatch ORDER_PROCESSED_EVENT for each order
        });
        notifyCountUpdated(); // Also dispatch COUNT_UPDATED_EVENT for immediate badge updates
        
        // Refresh the order counts to update badges (as a backup mechanism)
        refreshOrderCount();
        
        // Hide loading state
        setIsLoading(false);
      } else {
        // Create a zip file with separate Excel files for each order
        const zip = new JSZip();
        
        // Process each selected order
        const promises = selectedOrders.map(async (order, index) => {
          try {
            const { buffer, isZip } = await downloadOrder(order);
            
            // Generate human-friendly filename for this order
            const orderDate = new Date();
            const formattedDate = orderDate.toLocaleDateString('en-US', {
              year: 'numeric', 
              month: 'short', 
              day: 'numeric'
            }).replace(/,/g, '');
            const formattedTime = orderDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }).replace(/:/g, '-').replace(/\s/g, '');
            
            const filename = isZip
              ? `UploadTemplate_Order${index+1}_${formattedDate}_${formattedTime}.zip`
              : `UploadTemplate_Order${index+1}_${formattedDate}_${formattedTime}.xlsx`;
              
            zip.file(filename, buffer);
          } catch (error) {
            console.error(`Error processing order ${order.id}:`, error);
          }
        });
        
        await Promise.all(promises);
        
        // Generate zip file
        const zipContent = await zip.generateAsync({ type: 'blob' });
        
        // Generate human-friendly date and time format
        const zipDate = new Date();
        const formattedDate = zipDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).replace(/,/g, '');
        const formattedTime = zipDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/:/g, '-').replace(/\s/g, '');
        
        // Create download link
        const url = URL.createObjectURL(zipContent);
        const link = document.createElement('a');
        link.href = url;
        link.download = `UploadTemplate_${formattedDate}_${formattedTime}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        
        // Get current date and time for processing timestamp
        const now = new Date();
        const processedDate = now.toISOString().split('T')[0];
        const processedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
      // Mark all selected orders as processed with updated timestamps
      const updatedOrders = orders.map(order => 
        selectedOrderIds.includes(order.id) 
          ? { 
              ...order, 
              status: "processed" as const,
              timestamp: now.getTime(),
              date: processedDate,
              time: processedTime
            } 
          : order
      );
      
      setOrders(updatedOrders);
      
      // Update each order in the database
      const updatePromises = updatedOrders
        .filter(order => selectedOrderIds.includes(order.id))
        .map(order => updateOrder(order));
      
      await Promise.all(updatePromises);
      
      // Notify that orders have been processed
      for (const orderId of selectedOrderIds) {
        notifyOrderProcessed(orderId);
      }
      
      // Force a count update notification to update badges immediately
      notifyCountUpdated();
      
      // Refresh the order counts to update badges
      refreshOrderCount();
      
      // Hide loading state
      setIsLoading(false);        alert(`Successfully downloaded ${selectedOrders.length} orders as separate files.`);
      }
    } catch (error) {
      console.error("Error downloading selected orders:", error);
      alert("Failed to download selected orders. Please try again.");
      setIsLoading(false);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return { 
          bgColor: "bg-yellow-100", 
          textColor: "text-yellow-800",
          icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
        };
      case "processed":
        return { 
          bgColor: "bg-green-100", 
          textColor: "text-green-800",
          icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
        };
      default:
        return { 
          bgColor: "bg-gray-100", 
          textColor: "text-gray-800",
          icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
        };
    }
  };

  // Effect to update selectAll state when filters or search changes
  useEffect(() => {
    if (allFilteredOrders.length > 0) {
      const allFilteredSelected = allFilteredOrders.every(order => order.isSelected);
      setSelectAll(allFilteredSelected);
    } else {
      setSelectAll(false);
    }
  }, [allFilteredOrders, statusFilter, searchTerm]);
  
  // Listen for order updated events to refresh the list
  useEffect(() => {
    const handleOrderUpdate = async () => {
      try {
        setIsLoading(true);
        // Load all orders, not just pending ones
        const allOrders = await getOrdersOldestFirst();
        setOrders(allOrders);
      } catch (error) {
        console.error("Error refreshing orders:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Set up event listener for order updates
    window.addEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener(ORDER_UPDATED_EVENT, handleOrderUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Order Queue Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4 sm:mb-6">
          <div className="p-3 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span>Pending Orders Queue</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              View and download pending orders
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
                placeholder="Search orders by user or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Pending</option>
                <option value="pending">Pending Only</option>
              </select>
            </div>
            
            {/* Bulk Download Button */}
            {selectedOrderIds.length > 0 && (
              <button
                onClick={downloadSelectedOrders}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 sm:px-4 rounded-md text-sm font-medium transition-colors"
              >
                <Archive className="h-4 w-4" />
                <span>Download {selectedOrderIds.length} Selected</span>
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 sm:px-4 py-3 text-center">
                    <div 
                      className="cursor-pointer inline-flex justify-center"
                      onClick={handleToggleSelectAll}
                    >
                      {selectAll ? (
                        <CheckSquare className="h-5 w-5 text-blue-600 hover:text-blue-700 transition-colors" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400 hover:text-gray-700 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date & Time</span>
                      {sortField === "date" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("userName")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Submitted By</span>
                      {sortField === "userName" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalData")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Data</span>
                      {sortField === "totalData" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalCount")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Count</span>
                      {sortField === "totalCount" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cost
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                        <p className="text-gray-500">Loading orders...</p>
                      </div>
                    </td>
                  </tr>
                ) : allFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400 mb-3" />
                        <p className="text-gray-500">No orders found</p>
                        {searchTerm || statusFilter !== "all" ? (
                          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((order) => {
                    const statusStyle = getStatusBadge(order.status);
                    
                    return (
                      <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${order.isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-2 sm:px-4 py-4 text-center">
                          <div 
                            className="cursor-pointer inline-flex justify-center"
                            onClick={() => toggleOrderSelection(order.id)}
                          >
                            {order.isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600 hover:text-blue-700 transition-colors" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400 hover:text-gray-700 transition-colors" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {order.date}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.time}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {order.userName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {order.userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="mr-2">
                              <Database className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {order.totalData > 1023 
                                  ? `${(order.totalData / 1024).toFixed(2)} TB` 
                                  : `${order.totalData} GB`
                                }
                              </div>
                              <div className="text-xs text-gray-500">
                                {(order.totalData * 1024).toLocaleString()} MB
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {order.totalCount} numbers
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(order.orderCost !== undefined || order.estimatedCost !== undefined) ? (
                            <div className="flex items-center text-amber-600">
                              <DollarSign className="h-4 w-4 mr-1" />
                              <span className="text-sm font-medium">
                                {new Intl.NumberFormat('en-GH', { 
                                  style: 'currency', 
                                  currency: 'GHS',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2 
                                }).format(order.estimatedCost || order.orderCost || 0)}
                              </span>
                              {order.status === 'pending' && order.estimatedCost && (
                                <span className="ml-1 text-xs text-amber-500">(Est.)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not calculated</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor} gap-1.5`}>
                            {statusStyle.icon}
                            <span className="capitalize">{order.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => downloadSingleOrder(order)}
                            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
                            title="Download order"
                          >
                            <Download className="h-4 w-4 text-gray-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {!isLoading && allFilteredOrders.length > 0 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-500">
              {selectedOrderIds.length > 0 ? (
                <span className="text-blue-600 font-medium">
                  {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'order' : 'orders'} selected
                </span>
              ) : null}
            </div>
            
            {/* Page count info */}
            <div className="text-right text-xs text-gray-500">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, allFilteredOrders.length)} of {allFilteredOrders.length} orders
            </div>
            
            {/* Pagination */}
            {allFilteredOrders.length > itemsPerPage && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-1 rounded border ${currentPage === 1 ? 'text-gray-300 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
                  >
                    <span className="sr-only">First page</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`p-1 rounded border ${currentPage === 1 ? 'text-gray-300 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
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
                        const pageInput = document.querySelector('input[type="number"]') as HTMLInputElement;
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
                    className={`p-1 rounded border ${currentPage === totalPages ? 'text-gray-300 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
                  >
                    <span className="sr-only">Next page</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded border ${currentPage === totalPages ? 'text-gray-300 border-gray-200' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
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
