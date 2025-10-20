'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface OTPStatus {
  enabled: boolean;
  message: string;
  requiresEmailService: boolean;
}

export default function AdminOTPStatusIndicator() {
  const [otpStatus, setOtpStatus] = useState<OTPStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOTPStatus = async () => {
      try {
        const response = await fetch('/api/auth/otp/status');
        const data = await response.json();
        setOtpStatus(data);
      } catch (error) {
        console.error('Error fetching OTP status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOTPStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
        <span className="text-xs text-gray-600">Checking OTP status...</span>
      </div>
    );
  }

  if (!otpStatus) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${
      otpStatus.enabled 
        ? 'bg-green-50 border-green-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      {otpStatus.enabled ? (
        <ShieldCheck className="w-3 h-3 text-green-600" />
      ) : (
        <ShieldAlert className="w-3 h-3 text-yellow-600" />
      )}
      <span className={`text-xs font-medium ${
        otpStatus.enabled ? 'text-green-700' : 'text-yellow-700'
      }`}>
        OTP {otpStatus.enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
}