"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Database, Mail, Lock, User, LogIn, UserPlus, MessageCircle } from "lucide-react";

export default function SignIn() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    requestMessage: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  
  // Removed OTP state - now handled by dedicated OTP verification page
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for verification messages from URL
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'verified') {
      setSuccess('Email verified successfully! Your account is now pending admin approval.');
    } else if (message === 'already-verified') {
      setSuccess('Your email is already verified. Your account is pending admin approval.');
    }
  }, [searchParams]);

  // OTP timer removed - handled by dedicated verification page

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError("Please enter your email address");
      return;
    }

    setResendingVerification(true);
    setError("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Verification email sent! Please check your email and follow the verification link.");
        setShowResendVerification(false);
      } else {
        setError(data.error || "Failed to resend verification email");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setResendingVerification(false);
    }
  };

  // handleOTPSubmit removed - now handled by dedicated OTP verification page

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        // Check if OTP is enabled
        const otpCheckResponse = await fetch("/api/auth/otp/status");
        const otpStatus = await otpCheckResponse.json();
        
        if (!otpStatus.enabled) {
          // OTP is disabled, use regular credentials authentication
          const result = await signIn("credentials", {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (result?.error) {
            setError(result.error);
          } else if (result?.ok) {
            // Success - redirect to dashboard
            router.push("/");
            return;
          }
        } else {
          // OTP is enabled, request OTP for login
          const response = await fetch("/api/auth/otp/request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            if (data.locked) {
              setError(`Account temporarily locked. Try again in ${data.lockDuration} minutes.`);
            } else if (data.error.includes('verify your email')) {
              setError("Please verify your email address before signing in. Check your email for the verification link with OTP (One-Time Password).");
              setShowResendVerification(true);
            } else if (data.error.includes('pending approval')) {
              setError("Your account is pending approval. Please wait for admin approval.");
            } else if (data.error.includes('rejected')) {
              setError("Your account was rejected. Please contact support.");
            } else {
              setError(data.error || "Invalid email or password");
            }
          } else {
            // OTP sent successfully, redirect to verification page
            const params = new URLSearchParams({
              userId: data.userId.toString(),
              email: formData.email
            });
            
            // Include callback URL if present
            if (searchParams.get('callbackUrl')) {
              params.set('callbackUrl', searchParams.get('callbackUrl')!);
            }
            
            router.push(`/auth/verify-otp?${params.toString()}`);
            return;
          }
        }
      } else {
        // Register - validate password confirmation
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.requiresVerification) {
            setSuccess("Registration successful! Please check your email for a verification link with OTP. You must verify your email address before your account can be approved by an administrator.");
          } else {
            setSuccess("Registration successful! Your account is pending approval. You will be notified once approved.");
          }
          setFormData({ name: "", email: "", password: "", confirmPassword: "", requestMessage: "" });
        } else {
          setError(data.error || "Registration failed");
          if (data.resendAvailable) {
            setShowResendVerification(true);
          }
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Clickyfied</h1>
              <p className="text-sm text-gray-700">Secure access required</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Request Access
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              {showResendVerification && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-sm text-gray-700 mb-2">
                    Didn't receive the verification email?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendingVerification ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending OTP...
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-700" />
                  <input
                    type="text"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-700 sm:text-gray-700"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-700" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-700 sm:text-gray-700"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    A valid email address is required for verification and receiving OTP.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-700" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-700 sm:text-gray-700"
                  placeholder="Enter your password"
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-700 mt-1">Password must be at least 6 characters long</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-700" />
                  <input
                    type="password"
                    required={!isLogin}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-700 sm:text-gray-700 ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                  <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
                )}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Message (Optional)
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 w-5 h-5 text-gray-700" />
                  <textarea
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-700 sm:text-gray-700"
                    placeholder="Why do you need access to this system?"
                    rows={3}
                    value={formData.requestMessage}
                    onChange={(e) => setFormData({ ...formData, requestMessage: e.target.value })}
                  />
                </div>
                <p className="text-xs text-gray-700 mt-1">
                  Provide a brief explanation to help with approval
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Request Access
                </>
              )}
            </button>
          </form>

          {/* OTP UI removed - now handled by dedicated verification page */}
        </div>
      </div>
    </div>
  );
}
