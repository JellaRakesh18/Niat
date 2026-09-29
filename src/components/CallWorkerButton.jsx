'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Sanitizes and formats phone numbers into standard E.164 format.
 * Defaults to Indian country code (+91) for standard 10-digit mobile numbers.
 * 
 * @param {string} phone - Raw input phone number
 * @returns {string} E.164 formatted phone number (e.g. "+919121055449")
 */
export function sanitizeToE164(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (String(phone).trim().startsWith('+')) {
    return `+${digits}`;
  }
  return `+91${digits.slice(-10)}`;
}

/**
 * Formats phone string for user-friendly readability: "+91 91210 55449"
 * 
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted display string
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone;
}

/**
 * Determines whether the current client is a mobile telephony device.
 * Combines User Agent regex heuristics with touch points and screen dimensions.
 * 
 * @returns {boolean} True if running on a mobile or tablet device
 */
export function isTelephonySupported() {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const hasTouch = (
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
    ('msMaxTouchPoints' in navigator && navigator.msMaxTouchPoints > 0)
  );
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUA || (hasTouch && isSmallScreen);
}

/**
 * CallWorkerButton Component
 * 
 * Seamless cross-device call button:
 * - On Mobile: Native <a> link instantly launching mobile dialer (tel:+91...).
 * - On Desktop: Intercepts click and displays a modal with formatted phone,
 *   1-click copy with feedback, and scannable QR code to dial from smartphone.
 * 
 * @param {object} props
 * @param {string} props.phoneNumber - Worker's raw phone number
 * @param {string} props.workerName - Name of the worker
 * @param {string} [props.className] - Optional Tailwind CSS class overrides
 */
export default function CallWorkerButton({
  phoneNumber,
  workerName = 'Worker',
  className = '',
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);

  const e164Number = sanitizeToE164(phoneNumber);
  const displayPhone = formatPhoneDisplay(phoneNumber);
  const rawDigits = e164Number.replace(/\D/g, '');

  // Detect mobile environment on client mount
  useEffect(() => {
    setIsMobile(isTelephonySupported());

    const handleResize = () => {
      setIsMobile(isTelephonySupported());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!showModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  // Copy to clipboard handler with visual feedback
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(e164Number);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = e164Number;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy phone number to clipboard:', err);
    }
  };

  // Click handler
  const handleClick = (e) => {
    if (!isMobile) {
      // Intercept on desktop to prevent OS "Choose an application" protocol dialogs
      e.preventDefault();
      setShowModal(true);
    }
    // On mobile, let the default <a href="tel:..."> navigate natively to dialer
  };

  const defaultClasses =
    'bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all duration-150 shadow-sm active:scale-95 select-none cursor-pointer';

  // High-reliability QR code URL for tel: protocol
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=tel:${encodeURIComponent(e164Number)}`;

  return (
    <>
      {/* NATIVE LINK ON MOBILE / MODAL TRIGGER ON DESKTOP */}
      <a
        href={`tel:${e164Number}`}
        onClick={handleClick}
        className={`${defaultClasses} ${className}`}
        title={`Call ${workerName} (${displayPhone})`}
        aria-label={`Call ${workerName} at ${displayPhone}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3.5 h-3.5 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z"
            clipRule="evenodd"
          />
        </svg>
        <span>Call Direct</span>
      </a>

      {/* DESKTOP CALL HELPER MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-modal-title"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                  📞
                </div>
                <div>
                  <h3
                    id="call-modal-title"
                    className="font-bold text-sm leading-tight text-white"
                  >
                    Direct Contact
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium truncate max-w-[200px]">
                    {workerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Phone Display Card & Copy Button */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Mobile Number (India)
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                    {displayPhone}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3.5 h-3.5 text-slate-500"
                        >
                          <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                          <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v10A1.5 1.5 0 0 0 4.5 19h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06l-3.12-3.122A1.5 1.5 0 0 0 8.378 7H4.5Z" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code Section: Scan to Call on Mobile */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700">
                  📱 Scan with your phone camera to dial:
                </div>

                <div className="flex justify-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs inline-block">
                    <img
                      src={qrCodeUrl}
                      alt={`Scan QR code to call ${displayPhone}`}
                      className="w-36 h-36 rounded-lg object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-normal max-w-[240px] mx-auto">
                  Point your mobile camera at this code to dial immediately without typing.
                </p>
              </div>

              {/* Alternative WhatsApp Action */}
              <div className="pt-1">
                <a
                  href={`https://wa.me/${rawDigits}?text=${encodeURIComponent(
                    `Hello ${workerName}, I found your profile on Mazdoor Mitra and would like to discuss work.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-2xs"
                >
                  <span className="text-sm">💬</span>
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Modal Footer with Direct Link Fallback */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <a
                href={`tel:${e164Number}`}
                className="text-slate-500 hover:text-emerald-700 text-[11px] font-semibold underline"
                title="Launch application handler on desktop"
              >
                Try opening dialer app
              </a>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
