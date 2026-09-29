'use client';

import React, { useState, useEffect, useRef } from 'react';
import { handleSendOtp, handleVerifyOtp } from '../lib/supabaseAuth';

export default function LoginPage({ onLoginSuccess }) {
  // Role Selection State: 'worker' | 'employer'
  const [selectedRole, setSelectedRole] = useState('worker');

  // Multi-step Flow: 'phone' | 'otp'
  const [authStep, setAuthStep] = useState('phone');

  // Input states
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // References for 6-digit OTP input boxes
  const otpInputRefs = useRef([]);

  // Validate 10-digit Indian Mobile Number
  const isMobileValid = /^[6-9]\d{9}$/.test(mobileNumber);

  // Handle Mobile Number Input (Digits only, max 10)
  const handleMobileChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(rawVal);
    if (errorMessage) setErrorMessage('');
  };

  // Step 1: Send OTP handler
  const onRequestOtp = async (isResend = false) => {
    if (!isMobileValid) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await handleSendOtp(mobileNumber);
    setIsLoading(false);

    if (res.success) {
      setAuthStep('otp');
      setSuccessMessage(res.message || `OTP dispatched to +91 ${mobileNumber}`);
      setResendCountdown(30);
      setCanResend(false);

      // Focus first digit box
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }, 100);
    } else {
      setErrorMessage(res.error || 'Failed to dispatch verification code. Please check your number.');
    }
  };

  // Countdown Timer for OTP Resend
  useEffect(() => {
    let timer = null;
    if (authStep === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, resendCountdown]);

  // Handle individual OTP digit change
  const handleOtpDigitChange = (index, value) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    if (errorMessage) setErrorMessage('');

    // Auto-advance to next input
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keyboard events (Backspace navigating to previous box)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP Paste across 6 boxes
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);

    // Focus last filled box
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Step 2 & 3: Verify OTP & Profile Resolution
  const onVerifyOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await handleVerifyOtp(mobileNumber, fullOtp, selectedRole);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Authentication verified successfully! Redirecting...');
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(res);
      } else if (typeof window !== 'undefined') {
        window.location.href = res.redirectPath || (selectedRole === 'employer' ? '/employer/dashboard' : '/worker/dashboard');
      }
    } else {
      setErrorMessage(res.error || 'Invalid or expired OTP. Please verify and try again.');
    }
  };

  // Edit Phone Number (Back to step 1)
  const handleEditPhone = () => {
    setAuthStep('phone');
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Decorative Blur Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-gray-200 py-3.5 px-4 sm:px-8 relative z-20 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center text-white font-black text-sm shadow-md">
              MM
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                MAZDOOR <span className="text-emerald-700">MITRA</span>
              </span>
              <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                National Labour & Safety Network • 28 States & 8 UTs
              </p>
            </div>
          </div>

          <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
            ✓ Secure Gateway
          </span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-slate-800 space-y-6">
          
          {/* Header Badge */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wide border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Verified Mobile Authentication</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome to Mazdoor Mitra
            </h1>
            <p className="text-xs text-slate-500">
              Sign in with your verified Indian mobile number to access jobs, attendance, and instant hiring.
            </p>
          </div>

          {/* ROLE SELECTOR TOGGLE (Worker vs Contractor) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Select Your Account Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Worker */}
              <button
                type="button"
                onClick={() => setSelectedRole('worker')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                  selectedRole === 'worker'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl mb-0.5">👷</span>
                <span className="text-xs font-black">Worker</span>
                <span className="text-[10px] opacity-80">मजदूर • కార్మికుడు</span>
              </button>

              {/* Option 2: Contractor / Employer */}
              <button
                type="button"
                onClick={() => setSelectedRole('employer')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                  selectedRole === 'employer'
                    ? 'bg-blue-700 text-white border-blue-700 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl mb-0.5">🏢</span>
                <span className="text-xs font-black">Contractor</span>
                <span className="text-[10px] opacity-80">ठेकेदार • యజమాని</span>
              </button>
            </div>
          </div>

          {/* Error & Success Feedback Banners */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2">
              <span className="text-sm">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: MOBILE NUMBER INPUT */}
          {authStep === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex rounded-xl border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 bg-slate-50 transition">
                  <span className="inline-flex items-center px-3 rounded-l-xl border-r border-slate-300 text-slate-700 font-bold text-xs bg-slate-100">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={handleMobileChange}
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full bg-transparent px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  We will send a 6-digit one-time password via SMS to verify your account.
                </p>
              </div>

              {/* Get OTP Button */}
              <button
                type="button"
                onClick={() => onRequestOtp(false)}
                disabled={!isMobileValid || isLoading}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition shadow-sm flex items-center justify-center space-x-2 ${
                  isMobileValid && !isLoading
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span>Dispatching OTP...</span>
                ) : (
                  <>
                    <span>📨 Get OTP on Mobile</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: OTP VERIFICATION SCREEN */}
          {authStep === 'otp' && (
            <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              {/* Target Number Display with Edit */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-100 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">OTP sent to:</span>
                  <span className="text-slate-900 font-bold tracking-wider">
                    🇮🇳 +91 {mobileNumber.slice(0, 5)} {mobileNumber.slice(5)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEditPhone}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
                >
                  ✏️ Edit Number
                </button>
              </div>

              {/* 6 Individual Digit Boxes */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-2 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-between items-center gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-xl font-black bg-white border border-emerald-300 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900 outline-none shadow-xs transition"
                    />
                  ))}
                </div>
              </div>

              {/* Resend Countdown Timer */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-mono text-emerald-800 font-semibold text-[11px]">
                  {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Code expired'}
                </span>
                <button
                  type="button"
                  onClick={() => onRequestOtp(true)}
                  disabled={!canResend || isLoading}
                  className={`text-xs font-bold transition ${
                    canResend && !isLoading
                      ? 'text-emerald-700 hover:text-emerald-900 underline cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  🔄 Resend OTP
                </button>
              </div>

              {/* Verify & Proceed Button */}
              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={otpDigits.join('').length !== 6 || isLoading}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition shadow-md flex items-center justify-center space-x-2 ${
                  otpDigits.join('').length === 6 && !isLoading
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <span>✓ Verify & Proceed</span>
                )}
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Statutory Compliance Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto px-4 py-4 text-center text-xs text-slate-400 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <a
            href="tel:108"
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-xl text-xs font-black transition flex items-center space-x-1"
          >
            🚑 108 Ambulance
          </a>
          <a
            href="tel:112"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-xs font-black transition flex items-center space-x-1"
          >
            🛡️ 112 SOS
          </a>
        </div>

        <div className="text-[11px] text-slate-400">
          <span className="text-emerald-400 font-bold">DBOCW & e-Shram Compliant</span> • Payment of Wages Act 1936
        </div>
      </footer>
    </div>
  );
}
