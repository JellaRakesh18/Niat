'use client';

import React, { useState } from 'react';
import CosmicSplash from './CosmicSplash';

/**
 * Example Next.js Page or Layout Integration for Mazdoor Mitra
 * Demonstrates:
 * 1. Mounting the CosmicSplash on initial site visit.
 * 2. Remembering the visit using sessionStorage (optional).
 * 3. Gracefully unmounting and transitioning to the main dashboard / workers directory.
 */
export default function SplashDemo() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 relative">
      {/* 1. Fullscreen Cosmic Galaxy & Text Morph Splash */}
      {showSplash && (
        <CosmicSplash
          title="MAZDOOR MITRA"
          tagline="Find work, find workers, build a better future."
          autoSkipDuration={6800}
          particleCount={2800}
          onComplete={() => {
            setShowSplash(false);
          }}
        />
      )}

      {/* 2. Main Platform / Dashboard Viewport */}
      <main className={`transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cyan-500/30">
              M
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight">Mazdoor Mitra</h1>
              <p className="text-[11px] text-slate-400">All-India Verified Workers & Site Portal</p>
            </div>
          </div>
          <button
            onClick={() => setShowSplash(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
          >
            Replay Cosmic Intro
          </button>
        </header>

        <section className="max-w-4xl mx-auto py-12 px-6 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-4">
            Platform Ready &amp; Connected
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Welcome to Mazdoor Mitra
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Find certified construction labor, real-time site geolocation, GPS check-in attendance, and direct dialer connectivity across India.
          </p>
        </section>
      </main>
    </div>
  );
}
