import React, { useState } from 'react';
import { useLiveLocation } from '../hooks/useLiveLocation';

/**
 * LiveLocationBadge Component
 * 
 * Header component that displays real-time GPS tracking status and reverse-geocoded
 * administrative area names (Village / Ward / Mandal / District).
 * Clicking the badge opens a detailed diagnostic modal with manual refresh and cloud sync status.
 */
export default function LiveLocationBadge({ className = '' }) {
  const {
    coords,
    address,
    status,
    errorMessage,
    lastUpdated,
    isSyncing,
    syncSuccess,
    refreshLocation,
  } = useLiveLocation({ enableSync: true, distanceThreshold: 100 });

  const [isOpen, setIsOpen] = useState(false);

  // Format relative timestamp
  const getFormattedTime = (date) => {
    if (!date) return 'Just now';
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(date));
  };

  return (
    <>
      {/* 1. COMPACT HEADER BADGE TRIGGER */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer select-none active:scale-95 shadow-2xs ${
          status === 'active'
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200 hover:border-emerald-300'
            : status === 'locating'
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            : status === 'denied'
            ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
        } ${className}`}
        title="Click to view live GPS coordinates and location diagnostics"
      >
        {/* Animated GPS Status Beacon */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {status === 'active' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </>
          )}
          {status === 'locating' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse"></span>
          )}
          {(status === 'denied' || status === 'error') && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          )}
        </span>

        {/* Pin Icon */}
        <span className="text-brand-600">📍</span>

        {/* Dynamic Location Text */}
        <span className="truncate max-w-[130px] sm:max-w-[200px] md:max-w-[280px] font-bold">
          {status === 'locating' && !address?.formattedArea ? (
            <span className="flex items-center space-x-1 text-slate-500">
              <svg className="animate-spin h-3 w-3 text-amber-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Detecting GPS...</span>
            </span>
          ) : status === 'denied' ? (
            <span className="text-rose-700">Location Blocked</span>
          ) : (
            address?.formattedArea || 'India'
          )}
        </span>

        {/* Cloud Sync indicator dot */}
        {syncSuccess && status === 'active' && (
          <span className="hidden sm:inline-flex items-center text-[10px] text-emerald-700 font-extrabold" title="Synced with Supabase Cloud">
            ☁️
          </span>
        )}
      </button>

      {/* 2. LIVE LOCATION DETAILS MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-lg">🛰️</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight leading-none">Live GPS & Location Sync</h3>
                  <p className="text-[11px] text-emerald-100 font-medium mt-0.5">Real-time OpenStreetMap & Supabase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Permission Denied Warning Card */}
              {status === 'denied' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 font-bold text-rose-900">
                    <span>⚠️</span>
                    <span>Location Access is Blocked</span>
                  </div>
                  <p className="text-rose-700 text-[11px] leading-relaxed">
                    Browser location permissions are currently blocked. To get matching jobs and show nearby workers, please allow location access in your browser settings (look for the padlock icon 🔒 in the URL address bar).
                  </p>
                </div>
              )}

              {/* Area & Administrative Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Detected Administrative Area</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {status === 'active' ? 'Live GPS Active' : 'Cached / Pending'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                    <span>📍</span>
                    <span>{address?.localArea || 'Detecting Area...'}</span>
                  </div>
                  {address?.mandal && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">Mandal / Tehsil:</span> {address.mandal}
                    </div>
                  )}
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">District:</span> {address?.district || 'Detecting...'}
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">State:</span> {address?.state || 'India'}
                    {address?.pincode && <span className="ml-2 font-mono text-slate-500">({address.pincode})</span>}
                  </div>
                </div>
              </div>

              {/* Precise GPS Coordinates Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Latitude</div>
                  <div className="font-bold text-slate-800">
                    {coords?.latitude ? coords.latitude.toFixed(6) : '—'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Longitude</div>
                  <div className="font-bold text-slate-800">
                    {coords?.longitude ? coords.longitude.toFixed(6) : '—'}
                  </div>
                </div>
              </div>

              {/* Accuracy & Sync Status Rows */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">GPS Accuracy:</span>
                  <span className="font-semibold text-slate-800">
                    {coords?.accuracy ? `±${Math.round(coords.accuracy)} meters` : 'High Accuracy'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Last Refreshed:</span>
                  <span className="font-semibold text-slate-800">{getFormattedTime(lastUpdated)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Supabase Cloud Sync:</span>
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{syncSuccess ? 'Synchronized' : isSyncing ? 'Updating...' : 'Ready'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {coords?.latitude && coords?.longitude ? (
                <a
                  href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition"
                >
                  <span>Open in Maps</span>
                  <span>↗</span>
                </a>
              ) : (
                <div></div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={refreshLocation}
                  disabled={status === 'locating'}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                >
                  {status === 'locating' ? (
                    <>
                      <span className="animate-spin text-xs">⟳</span>
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <span>⟳</span>
                      <span>Refresh GPS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
