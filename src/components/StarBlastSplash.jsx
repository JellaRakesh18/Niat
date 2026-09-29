'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * StarBlastSplash Component
 * 
 * Animation Sequence:
 * 1. Ambient & Swirl: Small glowing star-like dots drift & swirl in circular paths across dark space.
 * 2. Convergence: Stars accelerate inward toward the center into a tight, pulsating glowing particle ball.
 * 3. Particle Blast: Singularity explodes outward with a radiant shockwave and scattering light sparks.
 * 4. Typography Reveal: "Welcome to Mazdoor Mitra" emerges with scale, glow, and crisp typography.
 * 5. Transition to Login: Holds for ~1.8s, then smoothly dissolves away to reveal the login screen.
 */
export default function StarBlastSplash({
  title = "Welcome to Mazdoor Mitra",
  subtitle = "Empowering Workers • Connecting Builders Across India",
  onComplete = () => {},
  holdDuration = 1800, // Duration in ms to hold the final text before transitioning
  showSkip = true,
  className = "",
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const starsRef = useRef([]);
  const blastSparksRef = useRef([]);

  const [phase, setPhase] = useState('swirl'); // 'swirl' | 'converge' | 'blast' | 'reveal' | 'exit'
  const [showText, setShowText] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Transition to login screen
  const handleExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setPhase('exit');

    setTimeout(() => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      onComplete?.();
    }, 600);
  }, [isExiting, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Timeline durations (milliseconds)
    const SWIRL_TIME = 1600;     // Initial drift and gentle swirl
    const CONVERGE_TIME = 1500;  // Rapid inward convergence
    const BLAST_TIME = SWIRL_TIME + CONVERGE_TIME; // 3100ms: Explosion trigger
    const REVEAL_DELAY = BLAST_TIME + 150;         // Text appearance
    const EXIT_TIME = BLAST_TIME + holdDuration + 1400; // Hold ~1.8s then exit

    // Generate ~450 glowing star dots
    const STAR_COUNT = width < 768 ? 320 : 500;
    const stars = [];
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Spread across and beyond the screen
      const maxDist = Math.max(width, height) * 0.75;
      const dist = Math.sqrt(Math.random()) * maxDist + 20;

      stars.push({
        id: i,
        // Orbital geometry
        baseDist: dist,
        currentDist: dist,
        angle: angle,
        angularSpeed: (0.008 + (1 / (dist * 0.05 + 1)) * 0.025) * (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4),
        // Position
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        // Visuals
        size: Math.random() * 2.2 + 0.8,
        baseAlpha: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.06 + 0.02,
        twinkleOffset: Math.random() * Math.PI * 2,
        // Blast velocity
        vx: 0,
        vy: 0,
        isBlasted: false,
      });
    }

    starsRef.current = stars;
    startTimeRef.current = performance.now();

    // Trigger text reveal
    const textTimer = setTimeout(() => {
      setShowText(true);
      setPhase('reveal');
    }, REVEAL_DELAY);

    // Auto transition to login
    const exitTimer = setTimeout(() => {
      handleExit();
    }, EXIT_TIME);

    // Explosion shockwave state
    let shockwaveRadius = 0;
    let shockwaveAlpha = 0;
    let blastTriggered = false;

    // Main 60fps render loop
    const render = (now) => {
      const elapsed = now - startTimeRef.current;
      const currentCx = width / 2;
      const currentCy = height / 2;

      // Solid Deep Midnight Blue background with soft motion trail
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(7, 11, 20, 0.32)'; // Deep Midnight Blue #070b14
      ctx.fillRect(0, 0, width, height);

      // Additive blending for luminous stars and blast energy
      ctx.globalCompositeOperation = 'lighter';

      // ----------------------------------------------------
      // PHASE 1 & 2: SWIRL AND CONVERGENCE
      // ----------------------------------------------------
      if (elapsed < BLAST_TIME) {
        let convergenceProgress = 0;
        if (elapsed > SWIRL_TIME) {
          const t = (elapsed - SWIRL_TIME) / CONVERGE_TIME;
          // Cubic ease-in acceleration into the center
          convergenceProgress = Math.min(1, Math.max(0, t * t * t));
        }

        // Render Singularity Glow as stars concentrate
        if (convergenceProgress > 0.4) {
          const coreSize = 18 + convergenceProgress * 32;
          const coreGlow = ctx.createRadialGradient(currentCx, currentCy, 0, currentCx, currentCy, coreSize);
          coreGlow.addColorStop(0, `rgba(255, 255, 255, ${convergenceProgress * 0.9})`);
          coreGlow.addColorStop(0.3, `rgba(56, 189, 248, ${convergenceProgress * 0.6})`);
          coreGlow.addColorStop(0.7, `rgba(14, 165, 233, ${convergenceProgress * 0.25})`);
          coreGlow.addColorStop(1, 'rgba(7, 11, 20, 0)');

          ctx.fillStyle = coreGlow;
          ctx.beginPath();
          ctx.arc(currentCx, currentCy, coreSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Animate drifting & converging stars
        const starList = starsRef.current;
        for (let i = 0; i < starList.length; i++) {
          const s = starList[i];
          // Swirl speed accelerates dramatically as stars pull closer
          const speedMultiplier = 1 + convergenceProgress * 5.5;
          s.angle += s.angularSpeed * speedMultiplier;

          // Collapse distance toward center
          const targetDist = s.baseDist * (1 - convergenceProgress) + (Math.sin(elapsed * 0.01 + s.id) * 6 * (1 - convergenceProgress));
          s.currentDist = Math.max(2, targetDist);

          s.x = currentCx + Math.cos(s.angle) * s.currentDist;
          s.y = currentCy + Math.sin(s.angle) * s.currentDist;

          // Twinkle effect
          const twinkle = Math.sin(elapsed * s.twinkleSpeed + s.twinkleOffset) * 0.3;
          const alpha = Math.min(1, Math.max(0.15, s.baseAlpha + twinkle));

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();

          // Subtle halo for brighter stars
          if (s.size > 1.8) {
            ctx.fillStyle = `rgba(224, 242, 254, ${alpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // ----------------------------------------------------
      // PHASE 3: THE BLAST / PARTICLE EXPLOSION
      // ----------------------------------------------------
      else {
        if (!blastTriggered) {
          blastTriggered = true;
          shockwaveRadius = 5;
          shockwaveAlpha = 1.0;
          setPhase('blast');

          // 1. Give each converged star a high-speed outward radial impulse
          const starList = starsRef.current;
          for (let i = 0; i < starList.length; i++) {
            const s = starList[i];
            const blastAngle = s.angle + (Math.random() - 0.5) * 0.6;
            const blastSpeed = 8 + Math.random() * 22;
            s.vx = Math.cos(blastAngle) * blastSpeed;
            s.vy = Math.sin(blastAngle) * blastSpeed;
            s.isBlasted = true;
          }

          // 2. Spawn brilliant secondary light fragments
          const sparkCount = 90;
          const sparks = [];
          for (let k = 0; k < sparkCount; k++) {
            const spkAngle = Math.random() * Math.PI * 2;
            const spkSpeed = 6 + Math.random() * 26;
            sparks.push({
              x: currentCx,
              y: currentCy,
              vx: Math.cos(spkAngle) * spkSpeed,
              vy: Math.sin(spkAngle) * spkSpeed,
              size: Math.random() * 3 + 1.2,
              alpha: 1.0,
              decay: 0.016 + Math.random() * 0.02,
              color: Math.random() > 0.4 ? 'rgba(255, 255, 255,' : 'rgba(56, 189, 248,',
            });
          }
          blastSparksRef.current = sparks;
        }

        // Animate Expanding Shockwave Ring
        if (shockwaveAlpha > 0.01) {
          shockwaveRadius += 16;
          shockwaveAlpha = Math.max(0, shockwaveAlpha - 0.028);

          ctx.strokeStyle = `rgba(255, 255, 255, ${shockwaveAlpha * 0.8})`;
          ctx.lineWidth = Math.max(1, 3 * shockwaveAlpha);
          ctx.beginPath();
          ctx.arc(currentCx, currentCy, shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Outer cyan ring aura
          ctx.strokeStyle = `rgba(56, 189, 248, ${shockwaveAlpha * 0.4})`;
          ctx.lineWidth = Math.max(1, 6 * shockwaveAlpha);
          ctx.beginPath();
          ctx.arc(currentCx, currentCy, Math.max(0, shockwaveRadius - 6), 0, Math.PI * 2);
          ctx.stroke();
        }

        // Render Outward Exploding Stars
        const starList = starsRef.current;
        for (let i = 0; i < starList.length; i++) {
          const s = starList[i];
          s.x += s.vx;
          s.y += s.vy;
          // Deceleration drag
          s.vx *= 0.94;
          s.vy *= 0.94;
          // Fade slowly to become atmospheric stardust
          s.baseAlpha = Math.max(0.08, s.baseAlpha * 0.985);

          ctx.fillStyle = `rgba(255, 255, 255, ${s.baseAlpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Render Secondary Light Fragments & Sparks
        const spkList = blastSparksRef.current;
        for (let k = 0; k < spkList.length; k++) {
          const spk = spkList[k];
          if (spk.alpha <= 0) continue;

          spk.x += spk.vx;
          spk.y += spk.vy;
          spk.vx *= 0.95;
          spk.vy *= 0.95;
          spk.alpha = Math.max(0, spk.alpha - spk.decay);

          ctx.fillStyle = `${spk.color} ${spk.alpha})`;
          ctx.beginPath();
          ctx.arc(spk.x, spk.y, spk.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [holdDuration, handleExit]);

  return (
    <div
      ref={containerRef}
      onClick={handleExit}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070b14] overflow-hidden select-none cursor-pointer transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      } ${className}`}
      aria-label="Welcome Intro Animation"
      role="banner"
    >
      {/* 1. Hardware-Accelerated Star & Blast Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
      />

      {/* 2. Top-Right "Skip" Button */}
      {showSkip && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExit();
            }}
            className="group px-4 py-2 rounded-full bg-slate-900/75 hover:bg-slate-850 border border-slate-700/60 hover:border-sky-400/50 text-slate-300 hover:text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-sky-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Skip</span>
            <span className="text-sky-400 group-hover:translate-x-0.5 transition-transform inline-block">
              &rarr;
            </span>
          </button>
        </div>
      )}

      {/* 3. Celestial Depth Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 35%, rgba(7, 11, 20, 0.75) 80%, #070b14 100%)',
        }}
      />

      {/* 4. Final Reveal: Large Bold Typography ("Welcome to Mazdoor Mitra") */}
      <div
        className={`relative z-20 flex flex-col items-center justify-center px-6 text-center max-w-2xl transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform ${
          showText
            ? 'opacity-100 scale-100 translate-y-0 filter-none'
            : 'opacity-0 scale-90 translate-y-6 blur-md'
        }`}
      >
        {/* Emblem or Monogram Badge */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-400 p-[2px] shadow-[0_0_35px_rgba(56,189,248,0.45)] mb-5">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-2xl sm:text-3xl text-white tracking-wider">
            MM
          </div>
        </div>

        {/* Large Bold Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-sky-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
            Mazdoor Mitra
          </span>
        </h1>

        {/* Professional Subtitle */}
        <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-300 font-medium tracking-wide drop-shadow-sm max-w-lg">
          {subtitle}
        </p>

        {/* Multilingual Bridge Pill */}
        <div className="mt-4 flex items-center gap-2 text-xs text-sky-400/80 font-medium">
          <span>काम पाएं, कारीगर पाएं</span>
          <span className="w-1 h-1 rounded-full bg-sky-400/50" />
          <span>పని పొందండి, కార్మికులను కనుగొనండి</span>
        </div>

        {/* Loading / Transitioning Hint */}
        <div className="mt-8 flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-slate-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Entering Login Portal...</span>
        </div>
      </div>
    </div>
  );
}
