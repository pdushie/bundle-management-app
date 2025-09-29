/**
 * Date utility functions
 */

/**
 * Format a date as a human-readable string
 * @param date - The date to format
 * @returns A formatted date string (e.g., "September 28, 2023")
 */
export function getFormattedDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get the start and end of a given date
 * @param date - The date to get bounds for
 * @returns An object with start and end timestamps
 */
export function getDateBounds(date: Date): { start: Date, end: Date } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return { start: startOfDay, end: endOfDay };
}

/**
 * Format a timestamp in hours and minutes (e.g., "14:30")
 * @param timestamp - The timestamp to format
 * @returns A formatted time string
 */
export function formatTime(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get the first and last day of a month
 * @param year - The year
 * @param month - The month (0-indexed)
 * @returns An object with first and last day dates
 */
export function getMonthBounds(year: number, month: number): { firstDay: Date, lastDay: Date } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { firstDay, lastDay };
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Boolean indicating if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}
