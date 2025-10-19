"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const messageParam = searchParams.get('message');

    if (statusParam) {
      // Handle redirected status from API
      switch (statusParam) {
        case 'success':
          setStatus('success');
          setMessage('Email verified successfully! Your account is now pending admin approval.');
          // Redirect to signin after 3 seconds
          setTimeout(() => {
            router.push('/auth/signin?message=verified');
          }, 3000);
          break;
        case 'already-verified':
          setStatus('success');
          setMessage('Your email is already verified. Your account is pending admin approval.');
          setTimeout(() => {
            router.push('/auth/signin?message=already-verified');
          }, 3000);
          break;
        case 'expired':
          setStatus('expired');
          setMessage('Your verification link has expired. Please request a new one.');
          break;
        case 'error':
          setStatus('error');
          setMessage(messageParam ? decodeURIComponent(messageParam) : 'An error occurred during verification.');
          break;
      }
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct verification link.');
      return;
    }

    // If we have a token but no status, redirect to API for processing
    window.location.href = `/api/auth/verify-email?token=${token}`;
  }, [token, router, searchParams]);

  const handleResendVerification = async () => {
    // We don't have the email here, so redirect to signin page with instruction
    router.push('/auth/signin?resend=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="text-center">
              {/* Icon based on status */}
              <div className="mx-auto w-16 h-16 mb-4">
                {status === 'loading' && (
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                )}
                {status === 'success' && (
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                )}
                {status === 'error' && (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                )}
                {status === 'expired' && (
                  <Clock className="w-16 h-16 text-yellow-500 mx-auto" />
                )}
              </div>

              {/* Title based on status */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {status === 'loading' && 'Verifying Email...'}
                {status === 'success' && 'Email Verified!'}
                {status === 'error' && 'Verification Failed'}
                {status === 'expired' && 'Link Expired'}
              </h1>

              {/* Message */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                {status === 'loading' && 'Please wait while we verify your email address...'}
                {status === 'success' && message}
                {status === 'error' && message}
                {status === 'expired' && 'Your verification link has expired. Please request a new one.'}
              </p>

              {/* Actions based on status */}
              {status === 'success' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      Redirecting to sign in page in 3 seconds...
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/auth/signin?message=verified')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continue to Sign In
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              )}

              {(status === 'error' || status === 'expired') && (
                <div className="space-y-4">
                  <button
                    onClick={handleResendVerification}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="mr-2 w-4 h-4" />
                    Request New Verification Link
                  </button>
                  <div className="text-sm text-gray-500">
                    <p>
                      Or{' '}
                      <button
                        onClick={() => router.push('/auth/signin')}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        return to sign in page
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Bundle Management System
          </p>
        </div>
      </div>
    </div>
  );
}