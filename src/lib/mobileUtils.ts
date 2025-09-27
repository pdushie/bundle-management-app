// Mobile-friendly utilities

export const formatPhoneNumberForMobile = (phoneNumber: string): string => {
  // Format phone numbers for better mobile display
  if (!phoneNumber || phoneNumber.length !== 10) return phoneNumber;
  
  // Format as XXX-XXX-XXXX for better readability
  return `${phoneNumber.substring(0, 3)}-${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6, 10)}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const formatDataSize = (sizeInGB: number): string => {
  // Format data size appropriately for display
  if (sizeInGB > 1023) {
    return `${(sizeInGB / 1024).toFixed(2)} TB`;
  }
  return `${sizeInGB.toFixed(2)} GB`;
};

// Check if device is mobile (smaller viewport)
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 640; // Same as sm: breakpoint in tailwind
};

export const getMobileHeaderStyles = () => {
  return `sticky top-0 z-10 px-3 py-2 text-xs font-medium text-gray-700 uppercase bg-gray-50`;
};

export const getMobileCellStyles = () => {
  return `px-3 py-2 text-sm border-b border-gray-100`;
};

// Generate mobile-friendly ID for linking elements
export const generateMobileId = (prefix: string, id: string): string => {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9]/g, '-')}`;
};
