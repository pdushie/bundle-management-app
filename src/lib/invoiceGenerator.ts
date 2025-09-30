/**
 * Generate PDF invoice for user billing
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserBillData } from '@/types/accounting';

// Extend the jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

/**
 * Add a table to the PDF document
 */
function pdfTable(doc: jsPDF, headers: string[], rows: string[][], startX: number, startY: number): void {
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: startY,
    startX: startX,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { 
      fillColor: [0, 83, 166], 
      textColor: [255, 255, 255],
      fontStyle: 'bold' 
    },
    alternateRowStyles: { fillColor: [245, 250, 255] },
    columnStyles: {
      0: { cellWidth: 35 },  // Order ID
      1: { cellWidth: 25 },  // Time
      2: { cellWidth: 30 },  // Data
      3: { cellWidth: 30 },  // Entries
      4: { cellWidth: 'auto' } // Amount
    },
    margin: { left: startX }
  });
}

/**
 * Format a number to currency string
 */
function formatCurrency(amount: number): string {
  return `GHS ${amount.toFixed(2)}`;
}

/**
 * Format a date string to a more readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate a PDF invoice from bill data
 */
export function generateInvoicePDF(billData: UserBillData): void {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `Invoice - ${billData.userName} - ${billData.date}`,
    subject: 'Bundle Management Invoice',
    author: 'Bundle Management System',
    creator: 'Bundle Management System'
  });
  
  // Add header
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 128);
  doc.text('INVOICE', 105, 20, { align: 'center' });
  
  // Add company info
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Bundle Management System', 20, 35);
  doc.text('123 Tech Street', 20, 40);
  doc.text('Accra, Ghana', 20, 45);
  doc.text('support@bundlemanagement.com', 20, 50);
  
  // Add customer info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text('Bill To:', 140, 35);
  doc.setFontSize(10);
  doc.text(billData.userName, 140, 40);
  doc.text(billData.userEmail, 140, 45);
  
  // Add invoice info
  doc.setFontSize(10);
  doc.text(`Invoice Date: ${formatDate(billData.date)}`, 140, 55);
  doc.text(`Invoice #: INV-${Date.now().toString().slice(-8)}`, 140, 60);
  
  // Draw a line separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(20, 70, 190, 70);
  
  // Create table with order details
  const tableColumn = ["Order ID", "Time", "Data (GB)", "Entries", "Amount"];
  const tableRows = billData.orders.map(order => [
    order.id.substring(0, 8) + "...",
    order.time,
    order.totalData.toFixed(2),
    order.totalCount.toString(),
    formatCurrency(order.estimatedCost)
  ]);
  
  // Add the table to the PDF
  pdfTable(doc, tableColumn, tableRows, 20, 75);
  
  // Add summary section
  const startY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.text("Summary", 140, startY);
  doc.line(140, startY + 2, 170, startY + 2);
  
  doc.text("Total Orders:", 140, startY + 10);
  doc.text(billData.orders.length.toString(), 175, startY + 10, { align: 'right' });
  
  doc.text("Total Data:", 140, startY + 15);
  doc.text(
    billData.totalData > 1024 
      ? `${(billData.totalData / 1024).toFixed(2)} TB` 
      : `${billData.totalData.toFixed(2)} GB`,
    175, startY + 15, { align: 'right' }
  );
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Total Amount:", 140, startY + 25);
  doc.text(formatCurrency(billData.totalAmount), 175, startY + 25, { align: 'right' });
  
  // Add footer
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text("Thank you for your business!", 105, 280, { align: 'center' });
  
  // Save the PDF
  doc.save(`Invoice-${billData.userName.replace(/\s/g, '_')}-${billData.date}.pdf`);
}
