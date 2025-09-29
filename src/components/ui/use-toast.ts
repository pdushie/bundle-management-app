import { useToast } from "@/components/ui/toast"

// Add the toast function export that PricingProfiles.tsx is expecting
export const toast = {
  success: (message: string, options?: any) => {
    console.log('Toast success:', message);
    // In a real implementation, this would call sonner's toast.success function
  },
  error: (message: string, options?: any) => {
    console.log('Toast error:', message);
    // In a real implementation, this would call sonner's toast.error function
  }
};

export { useToast }
