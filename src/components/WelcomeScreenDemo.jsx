'use client';

import React, { useState } from 'react';
import StarBlastSplash from './StarBlastSplash';
import LoginPage from './LoginPage';

/**
 * WelcomeScreenDemo
 * 
 * Demonstrates:
 * 1. Playing the StarBlastSplash automatically upon site load.
 * 2. Star swirl -> Inward convergence -> Center particle blast -> "Welcome to Mazdoor Mitra" reveal.
 * 3. Smooth fade-out unmounting the splash and seamlessly revealing LoginPage.
 */
export default function WelcomeScreenDemo() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden">
      {/* 1. Fullscreen Star Swirl, Blast & Welcome Reveal Intro */}
      {showSplash && (
        <StarBlastSplash
          title="Welcome to Mazdoor Mitra"
          subtitle="Empowering Workers • Connecting Builders Across India"
          holdDuration={1800} // Holds "Welcome to Mazdoor Mitra" for 1.8s
          onComplete={() => {
            setShowSplash(false);
          }}
        />
      )}

      {/* 2. Underlying Login Page / Authentication Gateway */}
      <div
        className={`transition-opacity duration-700 ease-out ${
          showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        <LoginPage />
      </div>
    </div>
  );
}
