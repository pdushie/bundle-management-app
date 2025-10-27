'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, ShieldCheck, ShieldAlert, Settings, Mail, Key } from 'lucide-react';

interface OTPStatus {
  enabled: boolean;
  message?: string;
  requiresEmailService?: boolean;
  source?: string;
  canToggle?: boolean;
}

export default function AdminOTPSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [otpStatus, setOtpStatus] = useState<OTPStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if user is super_admin only
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'super_admin') {
      router.push('/');
      return;
    }

    fetchOTPStatus();
  }, [session, status, router]);

  const fetchOTPStatus = async () => {
    try {
      const response = await fetch('/api/admin/otp/toggle');
      const data = await response.json();
      setOtpStatus(data);
    } catch (error) {
      // Console statement removed for security
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOTP = async () => {
    setIsUpdating(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/otp/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        await fetchOTPStatus(); // Refresh status
        
        // Auto-hide message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to toggle OTP settings');
      }
    } catch (error) {
      setMessage('An error occurred while updating OTP settings');
    } finally {
      setIsUpdating(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'super_admin') {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OTP Settings</h1>
            <p className="text-sm text-gray-700">Manage two-factor authentication settings</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
            {/* Current Status */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Current OTP Status
              </h2>
              
              {otpStatus && (
                <div className={`p-4 rounded-lg border-2 ${
                  otpStatus.enabled 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {otpStatus.enabled ? (
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-yellow-600" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        otpStatus.enabled ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        OTP Authentication is {otpStatus.enabled ? 'ENABLED' : 'DISABLED'}
                      </p>
                      <p className={`text-sm ${
                        otpStatus.enabled ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {otpStatus.enabled 
                          ? 'Users must verify OTP codes sent to their email during login'
                          : 'Users can sign in with email and password only'
                        }
                      </p>
                      {otpStatus.source === 'vercel' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Source: Vercel Environment Variable
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                OTP Controls
              </h2>
              
              <div className="space-y-4">
                {otpStatus?.canToggle === false ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium mb-2">Production Environment Detected</p>
                        <p className="mb-2">OTP settings cannot be changed directly in production. Current status is managed via environment variables.</p>
                        <p className="font-medium">To change OTP settings:</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          <li>Go to your Vercel Dashboard</li>
                          <li>Navigate to Project Settings ←’ Environment Variables</li>
                          <li>Update the <code className="bg-amber-100 px-1 rounded">ENABLE_OTP</code> variable</li>
                          <li>Redeploy your application</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={toggleOTP}
                    disabled={isUpdating}
                    className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
                      otpStatus?.enabled
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isUpdating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : otpStatus?.enabled ? (
                      <>
                        <ShieldAlert className="w-5 h-5" />
                        Disable OTP Authentication
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Enable OTP Authentication
                      </>
                    )}
                  </button>
                )}

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.includes('error') || message.includes('Failed')
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>

            {/* Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-2">Important Notes:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>When enabled:</strong> All users must verify OTP codes sent to their email during login</li>
                    <li><strong>When disabled:</strong> Users can sign in with email and password only (emergency fallback)</li>
                    <li><strong>Use case:</strong> Disable OTP temporarily when email service is down to maintain system availability</li>
                    <li><strong>Security:</strong> Enable OTP as soon as email service is restored for maximum security</li>
                  </ul>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

