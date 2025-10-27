'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function VerifyOTPPage() {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  useEffect(() => {
    // Redirect back to signin if no userId
    if (!userId) {
      router.push('/auth/signin');
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // First verify the OTP
      const otpResponse = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          otpCode: otpCode
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        if (otpData.locked) {
          setError(`Account locked due to too many failed attempts. Try again in ${otpData.lockDuration} minutes.`);
        } else {
          setError(otpData.error || "Invalid OTP code");
        }
        setIsLoading(false);
        return;
      }

      // OTP verified, now sign in with NextAuth using the OTP provider
      const result = await signIn("otp", {
        userId: userId,
        otpCode: otpCode,
        redirect: false,
        callbackUrl: "/" // Explicitly set callback URL to dashboard
      });

      // Console log removed for security

      if (result?.error) {
        // Console statement removed for security
        setError("Authentication failed. Please try again.");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Console log removed for security
        // Use window.location for hard redirect to ensure session is properly established
        window.location.href = '/';
        return;
      } else {
        // Console statement removed for security
        setError("Authentication failed. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      // Console statement removed for security
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRequestNewOTP = () => {
    // Redirect back to sign-in page to request a new OTP
    router.push('/auth/signin');
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Request
            </h2>
            <p className="text-gray-600 mb-6">
              Please start the sign-in process again.
            </p>
            <Link 
              href="/auth/signin"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Verify Your Identity</h1>
              <p className="text-sm text-gray-700">Enter the code sent to your email</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            We've sent a verification code to{' '}
            <span className="font-medium text-blue-600">{email}</span>
          </p>
        </div>

        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit verification code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setOtpCode(value);
                setError('');
              }}
              disabled={isLoading || timeLeft === 0}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {timeLeft > 0 ? (
                <span className="text-gray-500">
                  Code expires in {formatTime(timeLeft)}
                </span>
              ) : (
                <span className="text-red-500 font-medium">
                  Code expired
                </span>
              )}
            </div>
            
            {timeLeft <= 60 && (
              <button
                type="button"
                onClick={handleRequestNewOTP}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 font-medium"
              >
                Get new code
              </button>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !otpCode || otpCode.length !== 6 || timeLeft === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify & Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link 
              href="/auth/signin"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

