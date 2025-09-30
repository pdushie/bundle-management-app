/**
 * Client-side utility functions for working with the billing API
 */

// Types
export interface BillingSummary {
  date: string;
  totalData: number;
  totalAmount: number;
  orders: Array<{
    id: string;
    time: string;
    totalCount: number;
    totalData: number;
    status: string;
    pricingProfileName?: string;
    estimatedCost: number;
  }>;
}

/**
 * Get billing information for a specific date
 * @param date - The date in YYYY-MM-DD format
 * @returns A promise resolving to the billing summary for the specified date
 */
export async function getUserBilling(date: string): Promise<BillingSummary> {
  const response = await fetch(`/api/billing/daily?date=${date}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch billing information');
  }
  
  return response.json();
}

/**
 * Get billing information for a date range
 * @param startDate - The start date in YYYY-MM-DD format
 * @param endDate - The end date in YYYY-MM-DD format
 * @returns A promise resolving to an array of daily billing summaries
 */
export async function getUserBillingRange(startDate: string, endDate: string): Promise<BillingSummary[]> {
  const response = await fetch(`/api/billing/range?startDate=${startDate}&endDate=${endDate}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch billing range information');
  }
  
  return response.json();
}

/**
 * Get monthly billing summary
 * @param year - The year
 * @param month - The month (1-12)
 * @returns A promise resolving to the monthly billing summary
 */
export async function getMonthlyBilling(year: number, month: number): Promise<{
  totalData: number;
  totalAmount: number;
  dailySummaries: Array<{
    date: string;
    totalOrders: number;
    totalData: number;
    amount: number;
  }>
}> {
  const response = await fetch(`/api/billing/monthly?year=${year}&month=${month}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch monthly billing information');
  }
  
  return response.json();
}

/**
 * Export billing data as CSV
 * @param date - The date in YYYY-MM-DD format
 * @returns A promise resolving to the CSV data
 */
export async function exportBillingCSV(date: string): Promise<Blob> {
  const response = await fetch(`/api/billing/export?date=${date}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to export billing data');
  }
  
  return response.blob();
}
