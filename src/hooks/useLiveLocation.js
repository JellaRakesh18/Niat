/**
 * Mazdoor Mitra - Live Geolocation & Address Synchronization Hook
 * 
 * Features:
 * - Real-time tracking via navigator.geolocation.watchPosition
 * - 100m distance thresholding using the Haversine formula to prevent rate-limit spam
 * - Reverse-geocoding via OpenStreetMap Nominatim with granular Indian administrative hierarchy parsing
 *   (Village / Suburb -> Mandal / Taluk -> District -> State)
 * - Persistent synchronization with Supabase Cloud (public.workers / contractors)
 * - LocalStorage caching for instant startup rendering
 * - Resilience against permission denial, timeouts, and offline states
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

const DISTANCE_THRESHOLD_METERS = 100; // Only re-geocode when moved > 100m
const CACHE_STORAGE_KEY = 'mm_live_location_cache';
const USER_STORAGE_KEY = 'mm_current_user';

/**
 * Calculates distance between two GPS coordinates using the Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parses raw OpenStreetMap Nominatim response into Indian administrative structure
 * @param {object} data Nominatim raw JSON response
 * @returns {object} Formatted address components
 */
export function parseNominatimAddress(data) {
  if (!data || !data.address) {
    return {
      formattedArea: 'Location Detected',
      localArea: 'Current Location',
      mandal: '',
      district: '',
      state: 'India',
      pincode: '',
      displayName: data?.display_name || 'India',
    };
  }

  const addr = data.address;

  // Local Area (Village / Suburb / Colony / Ward / Town)
  const localArea =
    addr.village ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.residential ||
    addr.quarter ||
    addr.hamlet ||
    addr.town ||
    addr.city_district ||
    addr.city ||
    addr.municipality ||
    'Local Area';

  // Sub-district (Mandal / Taluk / Tehsil / Block)
  const mandal =
    addr.subdistrict ||
    addr.taluk ||
    addr.tehsil ||
    addr.county ||
    '';

  // District
  const district =
    addr.state_district ||
    addr.district ||
    addr.city ||
    '';

  // State & Pincode
  const state = addr.state || 'India';
  const pincode = addr.postcode || '';

  // Concise format for UI Badges: "📍 [Local Area], [District/City]"
  let formattedArea = localArea;
  if (district && district !== localArea) {
    formattedArea += `, ${district}`;
  } else if (state && state !== localArea) {
    formattedArea += `, ${state}`;
  }

  return {
    formattedArea,
    localArea,
    mandal,
    district,
    state,
    pincode,
    displayName: data.display_name,
  };
}

/**
 * Hook to manage live geolocation, reverse geocoding, and Supabase database synchronization
 */
export function useLiveLocation(options = {}) {
  const {
    enableSync = true,
    distanceThreshold = DISTANCE_THRESHOLD_METERS,
    highAccuracy = true,
  } = options;

  // Read initial cached location for instantaneous render
  const getCachedLocation = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const cached = getCachedLocation();

  const [location, setLocation] = useState({
    coords: cached?.coords || null,
    address: cached?.address || null,
    status: cached ? 'active' : 'locating', // 'idle' | 'locating' | 'active' | 'denied' | 'error' | 'timeout'
    errorMessage: null,
    lastUpdated: cached?.lastUpdated ? new Date(cached.lastUpdated) : null,
    isSyncing: false,
    syncSuccess: false,
  });

  // Track coordinates of last reverse-geocoding call
  const lastGeocodedCoordsRef = useRef(cached?.coords || null);
  const watchIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  /**
   * Synchronizes current location with Supabase Cloud
   */
  const syncLocationToSupabase = useCallback(async (coords, addressDetails) => {
    if (!enableSync || typeof window === 'undefined') return;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Identify currently logged in user (from session or app state)
      let userPhone = null;
      let userId = null;

      try {
        const rawUser = localStorage.getItem(USER_STORAGE_KEY);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          userPhone = parsed.phone || parsed.contact;
          userId = parsed.id;
        }
      } catch (e) {
        console.warn('Could not read user profile from storage:', e);
      }

      // Check active Supabase Auth user if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.phone) {
        userPhone = session.user.phone.replace('+91', '').trim();
      }

      const updateData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        current_area: addressDetails.formattedArea,
        last_seen_at: new Date().toISOString(),
      };

      let syncQuery = null;

      // Update in public.workers (which houses both workers and contractors/employers)
      if (userPhone) {
        syncQuery = supabase
          .from('workers')
          .update(updateData)
          .or(`phone.eq.${userPhone},phone.eq.+91${userPhone}`);
      } else if (userId) {
        syncQuery = supabase
          .from('workers')
          .update(updateData)
          .eq('id', userId);
      }

      if (syncQuery) {
        const { error } = await syncQuery;
        if (!error) {
          if (isMountedRef.current) {
            setLocation((prev) => ({ ...prev, syncSuccess: true, isSyncing: false }));
          }
        } else {
          // If columns don't exist yet, warn gracefully without breaking UI
          console.info('Supabase location sync notice:', error.message);
        }
      }

      // Dispatch global event for non-React dashboard listeners
      window.dispatchEvent(
        new CustomEvent('mazdoor:location-updated', {
          detail: { coords, address: addressDetails },
        })
      );
    } catch (err) {
      console.warn('Location sync to Supabase error:', err);
    }
  }, [enableSync]);

  /**
   * Performs reverse geocoding via OpenStreetMap Nominatim with rate-limit respect
   */
  const performReverseGeocode = useCallback(async (latitude, longitude, accuracy) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isMountedRef.current) {
        setLocation((prev) => ({ ...prev, isSyncing: true }));
      }

      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim geocoder error (HTTP ${response.status})`);
      }

      const data = await response.json();
      const parsedAddress = parseNominatimAddress(data);

      const now = new Date();
      const newCoords = { latitude, longitude, accuracy };

      // Update Cache
      const cachePayload = {
        coords: newCoords,
        address: parsedAddress,
        lastUpdated: now.toISOString(),
      };
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cachePayload));

      lastGeocodedCoordsRef.current = newCoords;

      if (isMountedRef.current) {
        setLocation({
          coords: newCoords,
          address: parsedAddress,
          status: 'active',
          errorMessage: null,
          lastUpdated: now,
          isSyncing: false,
          syncSuccess: true,
        });
      }

      // Persist to Supabase
      await syncLocationToSupabase(newCoords, parsedAddress);
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
      // Fallback: update coordinates even if reverse geocoder fails
      if (isMountedRef.current) {
        setLocation((prev) => ({
          ...prev,
          coords: { latitude, longitude, accuracy },
          status: 'active',
          isSyncing: false,
          address: prev.address || {
            formattedArea: `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`,
            localArea: 'GPS Coordinates',
            district: '',
            state: 'India',
          },
          lastUpdated: new Date(),
        }));
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [syncLocationToSupabase]);

  /**
   * Handles incoming position updates from navigator.geolocation
   */
  const handlePositionSuccess = useCallback((pos) => {
    const { latitude, longitude, accuracy } = pos.coords;

    // Check if we already geocoded nearby coordinates within threshold
    if (lastGeocodedCoordsRef.current) {
      const dist = calculateHaversineDistance(
        lastGeocodedCoordsRef.current.latitude,
        lastGeocodedCoordsRef.current.longitude,
        latitude,
        longitude
      );

      // Moved less than threshold -> only update raw coords, do not flood Nominatim API
      if (dist < distanceThreshold) {
        if (isMountedRef.current) {
          setLocation((prev) => ({
            ...prev,
            coords: { latitude, longitude, accuracy },
            status: 'active',
            lastUpdated: new Date(),
          }));
        }
        return;
      }
    }

    // Significant movement or initial acquisition -> reverse geocode
    performReverseGeocode(latitude, longitude, accuracy);
  }, [distanceThreshold, performReverseGeocode]);

  /**
   * Handles geolocation errors (e.g., user denied permission)
   */
  const handlePositionError = useCallback((err) => {
    let status = 'error';
    let errorMessage = 'Unable to retrieve location.';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        status = 'denied';
        errorMessage = 'Location permission was denied. Please allow access in browser settings.';
        break;
      case err.POSITION_UNAVAILABLE:
        status = 'error';
        errorMessage = 'GPS / Location information is currently unavailable.';
        break;
      case err.TIMEOUT:
        status = 'timeout';
        errorMessage = 'Location request timed out. Retrying...';
        break;
      default:
        status = 'error';
        errorMessage = err.message || 'An unknown location error occurred.';
    }

    console.warn(`[Mazdoor Mitra Geolocation] (${status}):`, errorMessage);

    if (isMountedRef.current) {
      setLocation((prev) => ({
        ...prev,
        status,
        errorMessage,
        isSyncing: false,
      }));
    }
  }, []);

  /**
   * Manual Refresh Trigger
   */
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, status: 'locating', errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        performReverseGeocode(latitude, longitude, accuracy);
      },
      handlePositionError,
      { enableHighAccuracy: highAccuracy, timeout: 8000, maximumAge: 0 }
    );
  }, [highAccuracy, handlePositionError, performReverseGeocode]);

  // Set up continuous watchPosition on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    const geoOptions = {
      enableHighAccuracy: highAccuracy,
      maximumAge: 10000,
      timeout: 8000,
    };

    // Begin active tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      geoOptions
    );

    // Initial immediate lookup if no cache
    if (!lastGeocodedCoordsRef.current) {
      navigator.geolocation.getCurrentPosition(
        handlePositionSuccess,
        handlePositionError,
        geoOptions
      );
    }

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [highAccuracy, handlePositionSuccess, handlePositionError]);

  return {
    ...location,
    refreshLocation,
  };
}

export default useLiveLocation;
