import { useState, useEffect } from 'react';

// Custom hook for responsive design
export function useResponsive() {
  // Initialize with default values
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  
  useEffect(() => {
    // Function to update sizes
    const updateSize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024); // md to lg
      setIsDesktop(window.innerWidth >= 1024); // lg and above
    };
    
    // Set sizes on initial load
    updateSize();
    
    // Add event listener
    window.addEventListener('resize', updateSize);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  return { isMobile, isTablet, isDesktop };
}

// Helper functions for responsive elements
export const getResponsiveIconSize = (isMobile: boolean, desktopSize = 5): number => {
  return isMobile ? Math.max(desktopSize - 1, 3) : desktopSize;
};

export const getResponsivePadding = (isMobile: boolean): string => {
  return isMobile ? 'px-2 py-2' : 'px-4 py-3';
};

export const getResponsiveFontSize = (isMobile: boolean, element: 'heading' | 'subheading' | 'normal' | 'small'): string => {
  if (element === 'heading') {
    return isMobile ? 'text-lg' : 'text-xl';
  } else if (element === 'subheading') {
    return isMobile ? 'text-base' : 'text-lg';
  } else if (element === 'normal') {
    return isMobile ? 'text-sm' : 'text-base';
  } else {
    return isMobile ? 'text-xs' : 'text-sm';
  }
};
