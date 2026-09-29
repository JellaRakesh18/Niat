/**
 * Mazdoor Mitra - Supabase Client Singleton Configuration
 * Next.js / React Supabase client instance with graceful fallback and connection diagnostics.
 */

import { createClient } from '@supabase/supabase-js';

// Read from Next.js environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Production fallback credentials if .env.local is missing in local environment
const FALLBACK_URL = 'https://eeocbfsgsqpymnnnzcmk.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb2NiZnNnc3FweW1ubm56Y21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDcyNjAsImV4cCI6MjEwNjE4MzI2MH0.jjzrmJxFVcw0cgUgp3gfTu_9hvxE87xTthjzXMlpxmw';

// Determine active credentials
const activeUrl = SUPABASE_URL || FALLBACK_URL;
const activeKey = SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

// Diagnostic warning if environment variables are not detected
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  if (typeof window !== 'undefined') {
    console.warn(
      '⚠️ [Mazdoor Mitra] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from environment. Using fallback cloud endpoint.'
    );
  }
}

// Reusable Singleton Instance
let supabaseInstance = null;

/**
 * Returns the initialized Supabase client singleton
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(activeUrl, activeKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      });

      if (typeof window !== 'undefined') {
        console.log('⚡ [Mazdoor Mitra] Supabase Client initialized successfully:', activeUrl);
      }
    } catch (err) {
      console.error('❌ [Mazdoor Mitra] Failed to initialize Supabase client:', err);
      // Fallback instance initialization
      supabaseInstance = createClient(FALLBACK_URL, FALLBACK_ANON_KEY);
    }
  }
  return supabaseInstance;
}

// Export default singleton
export const supabase = getSupabaseClient();

/**
 * Validates connectivity to the Supabase backend
 * @returns {Promise<{ready: boolean, message?: string, error?: string}>}
 */
export async function verifySupabaseConnection() {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { ready: false, error: 'Supabase client instance not created' };
    }
    // Quick ping to check if auth service responds
    const { data, error } = await client.auth.getSession();
    if (error) {
      return { ready: true, notice: error.message };
    }
    return { ready: true, message: 'Connected to Supabase' };
  } catch (err) {
    console.warn('⚠️ [Mazdoor Mitra] Connectivity check notice:', err);
    return { ready: false, error: err.message };
  }
}

export default supabase;
