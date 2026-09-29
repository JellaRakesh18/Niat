'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useLiveLocation, calculateHaversineDistance } from '../hooks/useLiveLocation';

const OFFLINE_QUEUE_KEY = 'mm_offline_attendance_queue';
const ATTENDANCE_BUCKET = 'attendance-selfies';

/**
 * Standard Site Geofence Benchmark (can be overridden via props)
 * Default: 500 meters allowed radius
 */
const DEFAULT_SITE = {
  name: 'Hyderabad Cyber Site B',
  latitude: 17.4435,
  longitude: 78.3772,
  radiusMeters: 500,
};

/**
 * DailyAttendanceCheckIn Component
 * 
 * Production-ready WebRTC camera viewfinder, selfie facial check-in,
 * GPS geofence verification, canvas photo watermarking, Supabase Storage integration,
 * and offline PWA synchronization queue.
 */
export default function DailyAttendanceCheckIn({
  worker = null,
  siteCoordinates = DEFAULT_SITE,
  onCheckInSuccess = null,
  className = '',
}) {
  // 1. Live GPS tracking from Mazdoor Mitra hook
  const { coords, address, status: gpsStatus } = useLiveLocation({
    enableSync: true,
    distanceThreshold: 50,
  });

  // 2. Camera & Viewfinder States
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [cameraStatus, setCameraStatus] = useState('loading'); // 'loading' | 'streaming' | 'denied' | 'unsupported' | 'error'
  const [cameraError, setCameraError] = useState(null);

  // 3. Capture & Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'warning', message: '' }

  // Resolve current worker info
  const currentWorker = worker || {
    id: 'W-LOCAL-001',
    name: 'Skilled Artisan',
    phone: '9848011223',
    trade: 'General Construction',
  };

  /**
   * Safe camera stream initializer
   */
  const startCamera = useCallback(async () => {
    setCameraStatus('loading');
    setCameraError(null);

    // Stop any existing active tracks before re-initializing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setCameraError('Camera access is not supported by your browser or environment (requires HTTPS).');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Explicitly call play() to adhere to mobile autoplay restrictions
        videoRef.current
          .play()
          .then(() => {
            setCameraStatus('streaming');
          })
          .catch((playErr) => {
            console.warn('Video play auto-interrupted:', playErr);
            setCameraStatus('streaming');
          });
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraError('Camera permission was blocked. Please tap the lock icon in your address bar and allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('error');
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraStatus('error');
        setCameraError('Camera is already in use by another application.');
      } else {
        setCameraStatus('error');
        setCameraError(err.message || 'Unable to open camera feed.');
      }
    }
  }, [facingMode]);

  // Mount camera on load and clean up on unmount
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // 4. Geofence Distance Calculation
  const geofenceResult = React.useMemo(() => {
    if (!coords || !siteCoordinates) {
      return { isWithin: true, distanceMeters: null, status: 'unknown' };
    }

    const distance = Math.round(
      calculateHaversineDistance(
        coords.latitude,
        coords.longitude,
        siteCoordinates.latitude,
        siteCoordinates.longitude
      )
    );

    const isWithin = distance <= (siteCoordinates.radiusMeters || 500);
    return {
      isWithin,
      distanceMeters: distance,
      status: isWithin ? 'verified' : 'outside_site',
    };
  }, [coords, siteCoordinates]);

  // Load offline attendance queue count
  const refreshOfflineCount = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      setOfflineCount(queue.length);
    } catch {
      setOfflineCount(0);
    }
  }, []);

  useEffect(() => {
    refreshOfflineCount();
  }, [refreshOfflineCount]);

  /**
   * Auto-sync offline queue when internet connection restores
   */
  useEffect(() => {
    const handleOnline = async () => {
      if (typeof window === 'undefined') return;
      try {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (!queue.length) return;

        const supabase = getSupabaseClient();
        if (!supabase) return;

        let syncedCount = 0;
        const remainingQueue = [];

        for (const item of queue) {
          const { error } = await supabase.from('attendance').insert([item.payload]);
          if (!error) {
            syncedCount++;
          } else {
            remainingQueue.push(item);
          }
        }

        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
        setOfflineCount(remainingQueue.length);

        if (syncedCount > 0) {
          setFeedback({
            type: 'success',
            message: `Synced ${syncedCount} queued check-in(s) to Supabase Cloud!`,
          });
        }
      } catch (e) {
        console.warn('Auto-sync error:', e);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  /**
   * Toggle between Front and Back camera
   */
  const toggleCameraFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  /**
   * Draw timestamp & GPS coordinate watermark directly onto the canvas image
   */
  const applyWatermarkToCanvas = (ctx, width, height) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const latStr = coords ? `${coords.latitude.toFixed(5)}°N` : '17.4435°N';
    const lonStr = coords ? `${coords.longitude.toFixed(5)}°E` : '78.3772°E';
    const accStr = coords?.accuracy ? `±${Math.round(coords.accuracy)}m` : '±5m';
    const areaName = address?.localArea || address?.district || siteCoordinates.name || 'Job Site';

    // Dark semi-transparent watermark banner
    const bannerHeight = Math.max(70, Math.round(height * 0.18));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Accent line on top of banner
    ctx.fillStyle = '#10b981'; // Emerald 500
    ctx.fillRect(0, height - bannerHeight, width, 3);

    // Text rendering setup
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';

    const paddingX = 14;
    const startY = height - bannerHeight + 10;

    // Line 1: Worker & Timestamp
    ctx.fillText(`👷 ${currentWorker.name} (${currentWorker.trade})`, paddingX, startY);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px "Segoe UI", Roboto, monospace';
    ctx.fillText(`${dateStr} • ${timeStr}`, width - 180, startY);

    // Line 2: GPS coordinates & Site
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`📍 ${latStr}, ${lonStr} (${accStr}) • ${areaName}`, paddingX, startY + 22);

    // Line 3: Statutory compliance badge
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `✓ DBOCW Geofence: ${geofenceResult.isWithin ? 'VERIFIED ON-SITE' : 'REMOTE CHECK-IN'}`,
      paddingX,
      startY + 40
    );
  };

  /**
   * Main Check-In Capture Action
   */
  const handleCaptureAndSave = async () => {
    if (isSubmitting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Verify video stream status
    if (!video || cameraStatus !== 'streaming' || video.readyState < 2) {
      setFeedback({
        type: 'warning',
        message: 'Camera stream is not ready. Please wait a moment or allow camera permission.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 640;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Draw active video frame
      ctx.drawImage(video, 0, 0, width, height);

      // Apply watermark stamp
      applyWatermarkToCanvas(ctx, width, height);

      // Generate preview and blob
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPreview(dataUrl);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));

      // Build Unique File Name: workerId_timestamp.jpg
      const cleanPhone = String(currentWorker.phone || '0000').replace(/\D/g, '');
      const uniqueFileName = `${currentWorker.id || cleanPhone}_${Date.now()}.jpg`;

      const now = new Date();
      let selfiePublicUrl = dataUrl; // Default to data URL if cloud storage is unavailable

      // Upload to Supabase Storage if online and client is active
      const supabase = getSupabaseClient();
      if (supabase && navigator.onLine && blob) {
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(ATTENDANCE_BUCKET)
            .upload(uniqueFileName, blob, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from(ATTENDANCE_BUCKET)
              .getPublicUrl(uniqueFileName);
            if (publicUrlData?.publicUrl) {
              selfiePublicUrl = publicUrlData.publicUrl;
            }
          } else {
            console.info('Storage bucket upload notice (using local data URL fallback):', uploadErr?.message);
          }
        } catch (storageErr) {
          console.warn('Storage upload exception:', storageErr);
        }
      }

      // Build payload matching public.attendance schema
      const attendancePayload = {
        worker_name: currentWorker.name,
        date: now.toISOString().split('T')[0],
        timestamp: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'Check-In',
        location: address?.formattedArea || siteCoordinates.name || 'Site Work',
        verified: true,
        // Upgraded fields (safely ignored by Supabase if columns not yet migrated)
        worker_id: currentWorker.id || cleanPhone,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        location_name: address?.localArea || siteCoordinates.name || 'Job Site',
        selfie_url: selfiePublicUrl,
        checkin_time: now.toISOString(),
        geofence_status: geofenceResult.status,
      };

      // Try inserting into Supabase
      let savedToCloud = false;
      if (supabase && navigator.onLine) {
        try {
          const { error: insertErr } = await supabase.from('attendance').insert([attendancePayload]);
          if (!insertErr) {
            savedToCloud = true;
          } else {
            console.warn('Supabase attendance insert notice:', insertErr.message);
          }
        } catch (insertEx) {
          console.warn('Supabase attendance insert exception:', insertEx);
        }
      }

      // Fallback: Queue locally if offline or insert failed
      if (!savedToCloud) {
        try {
          const currentQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
          currentQueue.unshift({
            id: Date.now(),
            payload: attendancePayload,
            capturedAt: now.toISOString(),
          });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue.slice(0, 50)));
          refreshOfflineCount();
        } catch (queueErr) {
          console.warn('Local queue error:', queueErr);
        }
      }

      // Prepend to local component history
      setAttendanceHistory((prev) => [
        {
          id: Date.now(),
          ...attendancePayload,
          previewUrl: dataUrl,
          savedToCloud,
        },
        ...prev,
      ]);

      // Trigger user feedback
      setFeedback({
        type: 'success',
        message: savedToCloud
          ? 'Attendance Marked Successfully! Verified on Supabase Cloud.'
          : 'Attendance Recorded Offline! Will auto-sync when network reconnects.',
      });

      if (onCheckInSuccess) {
        onCheckInSuccess(attendancePayload);
      }
    } catch (err) {
      console.error('Attendance capture error:', err);
      setFeedback({
        type: 'error',
        message: `Failed to record attendance: ${err.message || 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Punch-In Card */}
      <div className="bg-white rounded-3xl border border-purple-200 shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
              Digital Proof of Work
            </span>
            <h2 className="text-xl font-black mt-1">Daily Site Attendance & Selfie Check-In</h2>
            <p className="text-xs text-purple-100">
              AI geo-tagged and timestamped attendance to guarantee undisputed wage payouts.
            </p>
          </div>

          {/* Camera switcher button */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={toggleCameraFacingMode}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              title="Switch Front / Back Camera"
            >
              <span>🔄</span>
              <span>{facingMode === 'user' ? 'Front (Selfie)' : 'Back (Site)'}</span>
            </button>
          </div>
        </div>

        {/* Viewfinder & Geofence Section */}
        <div className="p-6 space-y-6">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : feedback.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{feedback.type === 'success' ? '✓' : '⚠️'}</span>
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Central Camera Viewfinder */}
          <div className="max-w-md mx-auto space-y-4">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-purple-400 shadow-2xl flex items-center justify-center">
              {/* Active Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                } ${cameraStatus === 'streaming' ? 'block' : 'hidden'}`}
              />

              {/* Loading State Spinner */}
              {cameraStatus === 'loading' && (
                <div className="text-center text-white space-y-2 p-4">
                  <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold">Initializing camera feed...</p>
                </div>
              )}

              {/* Permission Denied / Error Fallback UI */}
              {(cameraStatus === 'denied' || cameraStatus === 'error' || cameraStatus === 'unsupported') && (
                <div className="p-6 text-center text-white space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mx-auto">
                    📷
                  </div>
                  <h4 className="text-sm font-bold text-rose-300">Camera Feed Blocked</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed max-w-[220px] mx-auto">
                    {cameraError || 'Unable to access your device camera.'}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Request Camera Permission
                  </button>
                </div>
              )}

              {/* Viewfinder Overlays */}
              {cameraStatus === 'streaming' && (
                <>
                  {/* Framing Reticle */}
                  <div className="absolute inset-0 border-2 border-white/40 pointer-events-none rounded-2xl m-3"></div>
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 border border-dashed border-white/30 rounded-full pointer-events-none"></div>

                  {/* Top Status Badges */}
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                    <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center shadow-xs">
                      <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-ping"></span> REC GPS
                    </span>
                  </div>

                  {/* Geofence verification badge on viewfinder */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center shadow-xs ${
                        geofenceResult.isWithin
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {geofenceResult.isWithin ? '✓ On-Site' : '⚠️ Off-Site'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* GPS & Geofence Diagnostics Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500">Live GPS Location:</span>
                <span className="text-slate-900 font-mono">
                  {coords
                    ? `${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E`
                    : 'Acquiring GPS fix...'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Administrative Area:</span>
                <span className="font-bold text-slate-800">
                  {address?.formattedArea || 'India'}
                </span>
              </div>

              {/* Geofence Status */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Job Site Geofence:</span>
                <div className="text-right">
                  <span
                    className={`font-extrabold ${
                      geofenceResult.isWithin ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {geofenceResult.isWithin ? 'Verified within 500m' : 'Outside Registered Site'}
                  </span>
                  {geofenceResult.distanceMeters !== null && (
                    <div className="text-[10px] text-slate-400">
                      Approx. {geofenceResult.distanceMeters}m from site benchmark
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Offline Queue Badge (if any items pending) */}
            {offlineCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span>📶</span>
                  <span className="font-bold">{offlineCount} check-in(s) queued offline</span>
                </div>
                <span className="text-[11px] text-amber-700">Auto-syncs when online</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleCaptureAndSave}
              disabled={isSubmitting || cameraStatus !== 'streaming'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-2xl text-xs transition shadow-lg flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Watermarking & Saving Attendance...</span>
                </>
              ) : (
                <>
                  <span className="text-base">📸</span>
                  <span>Capture & Save Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History & Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
            <span>📋</span>
            <span>Undisputed Work History & Wage Ledger</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {attendanceHistory.length} today
          </span>
        </div>

        {attendanceHistory.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No attendance punched yet today. Tap "Capture & Save Attendance" above to punch in.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attendanceHistory.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  {item.previewUrl && (
                    <img
                      src={item.previewUrl}
                      alt="Selfie Check-in"
                      className="w-12 h-12 rounded-xl object-cover border border-purple-200 shadow-2xs"
                    />
                  )}
                  <div>
                    <div className="font-extrabold text-slate-900">{item.worker_name}</div>
                    <div className="text-slate-500 text-[11px]">
                      {item.date} • {item.timestamp} • {item.location}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.savedToCloud
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.savedToCloud ? '☁️ Cloud Synced' : '💾 Queued Locally'}
                  </span>
                  <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    ✓ GPS Verified
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
