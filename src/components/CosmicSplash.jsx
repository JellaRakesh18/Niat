'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * CosmicSplash Component for Mazdoor Mitra
 * 
 * Features:
 * 1. Visual Effect: Cosmic galaxy vortex with 3,000+ glowing cyan, blue, and starlight-white particles.
 * 2. Morph & Reveal: Particles fluidly converge and coalesce into the glowing 3D title "Mazdoor Mitra".
 * 3. Tagline: Fades in directly below with glowing celestial typography: "Find work, find workers, build a better future."
 * 4. Transition Controls: Top-right "Skip Intro -> Click to enter platform" button & click-to-enter trigger.
 * 5. High Performance: Zero heavy 3D engine overhead; pure 60-120fps hardware-accelerated Canvas with additive blending.
 */
export default function CosmicSplash({
  title = 'MAZDOOR MITRA',
  tagline = 'Find work, find workers, build a better future.',
  onComplete = () => {},
  autoSkipDuration = 6800, // Duration in ms before auto-transitioning
  particleCount = 2800,
  showSkipButton = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const particlesRef = useRef([]);
  const textCoordsRef = useRef([]);

  // Animation phase states
  const [phase, setPhase] = useState('vortex'); // 'vortex' | 'morph' | 'formed' | 'exiting'
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000, active: false });

  /**
   * Color palette: Cosmic Galaxy (Cyan, Deep Blue, Electric Azure, Starlight White, Violet)
   */
  const PARTICLE_COLORS = [
    { r: 0,   g: 240, b: 255, hex: '#00f0ff' }, // Electric Cyan
    { r: 34,  g: 211, b: 238, hex: '#22d3ee' }, // Vivid Sky
    { r: 59,  g: 130, b: 246, hex: '#3b82f6' }, // Cosmic Blue
    { r: 99,  g: 102, b: 241, hex: '#6366f1' }, // Deep Indigo
    { r: 255, g: 255, b: 255, hex: '#ffffff' }, // Starlight White
    { r: 147, g: 197, b: 253, hex: '#93c5fd' }, // Ice Blue
  ];

  /**
   * Smoothly triggers the exit transition and unmounts the splash screen
   */
  const handleExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setPhase('exiting');

    // Scatter particles outwards in a warp-drive / supernova burst
    if (particlesRef.current.length > 0) {
      const canvas = canvasRef.current;
      const cx = canvas ? canvas.width / (2 * (window.devicePixelRatio || 1)) : window.innerWidth / 2;
      const cy = canvas ? canvas.height / (2 * (window.devicePixelRatio || 1)) : window.innerHeight / 2;

      particlesRef.current.forEach((p) => {
        const angle = Math.atan2(p.y - cy, p.x - cx) + (Math.random() - 0.5) * 0.4;
        const force = 18 + Math.random() * 25;
        p.vx = Math.cos(angle) * force;
        p.vy = Math.sin(angle) * force;
      });
    }

    // Call onComplete after exit fade-out completes
    setTimeout(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      onComplete?.();
    }, 650);
  }, [isExiting, onComplete]);

  /**
   * Rasterize text to an offscreen canvas and sample pixel coordinates
   */
  const sampleTextGrid = useCallback((width, height, targetText) => {
    if (typeof document === 'undefined') return [];

    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    offCanvas.width = width;
    offCanvas.height = height;

    // Dynamically calculate font size to fit neatly across mobile and desktop
    const isMobile = width < 768;
    const baseSize = isMobile ? Math.min(width * 0.115, 48) : Math.min(width * 0.082, 88);

    offCtx.fillStyle = '#ffffff';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.font = `900 ${Math.round(baseSize)}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    // Position text slightly above center to balance tagline below
    const textCenterY = height * 0.44;
    offCtx.fillText(targetText, width / 2, textCenterY);

    const imgData = offCtx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const points = [];

    // Adaptive step density: sample pixels where opacity is high
    const step = isMobile ? 3 : 3;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = pixels[index + 3];
        if (alpha > 140) {
          points.push({
            x,
            y,
            alpha: alpha / 255,
          });
        }
      }
    }

    return points;
  }, []);

  /**
   * Initialize particle system and start WebGL/Canvas rendering loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Re-sample text positions on resize
      textCoordsRef.current = sampleTextGrid(width, height, title);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial text raster points
    const textPoints = sampleTextGrid(width, height, title);
    textCoordsRef.current = textPoints;

    // Determine optimal particle count
    const count = Math.min(particleCount, width < 768 ? 1800 : 3200);
    const particles = [];

    // Pre-create galaxy vortex particles
    const cx = width / 2;
    const cy = height / 2;
    const arms = 3; // 3-arm logarithmic cosmic spiral
    const armOffset = (Math.PI * 2) / arms;

    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const distRatio = Math.pow(Math.random(), 1.6); // Higher particle density near cosmic core
      const maxRadius = Math.min(width, height) * 0.72;
      const r = 25 + distRatio * maxRadius;
      const spiralFactor = 2.4;
      const angle = arm * armOffset + Math.log(r) * spiralFactor + (Math.random() - 0.5) * 0.65;

      const pX = cx + Math.cos(angle) * r;
      const pY = cy + Math.sin(angle) * (r * 0.65); // 3D perspective slant
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

      particles.push({
        id: i,
        // Current position
        x: pX,
        y: pY,
        z: (Math.random() - 0.5) * 400,
        // Vortex trajectory properties
        r,
        baseAngle: angle,
        angularSpeed: (0.012 + (1 / (r * 0.08 + 1)) * 0.04) * (Math.random() * 0.4 + 0.8),
        arm,
        // Particle size & glow
        size: Math.random() * 2.2 + 0.8,
        glowSize: Math.random() * 8 + 4,
        alpha: Math.random() * 0.6 + 0.4,
        color,
        // Morphing & text targets
        tx: null,
        ty: null,
        vx: 0,
        vy: 0,
        shimmerOffset: Math.random() * Math.PI * 2,
        shimmerSpeed: 0.04 + Math.random() * 0.05,
      });
    }

    particlesRef.current = particles;
    startTimeRef.current = performance.now();

    // Map particles to target text points (smooth 1-to-1 distribution)
    const assignTextTargets = () => {
      const pts = textCoordsRef.current;
      if (!pts || pts.length === 0) return;

      particles.forEach((p, idx) => {
        // Distribute particles across text points; excess particles form an ethereal outer aura
        if (idx < pts.length) {
          p.tx = pts[idx].x;
          p.ty = pts[idx].y;
        } else {
          // Extra particles orbit closely around letter contours as starlight dust
          const randomPt = pts[Math.floor(Math.random() * pts.length)];
          const haloAngle = Math.random() * Math.PI * 2;
          const haloDist = Math.random() * 24 + 4;
          p.tx = randomPt.x + Math.cos(haloAngle) * haloDist;
          p.ty = randomPt.y + Math.sin(haloAngle) * haloDist;
        }
      });
    };

    assignTextTargets();

    // Keyframe sequence timings
    const VORTEX_DURATION = 2400; // ms
    const MORPH_DURATION = 2000;  // ms
    const TAGLINE_DELAY = 4200;   // ms

    const taglineTimer = setTimeout(() => {
      setTaglineVisible(true);
      setPhase('formed');
    }, TAGLINE_DELAY);

    const autoSkipTimer = setTimeout(() => {
      handleExit();
    }, autoSkipDuration);

    /**
     * Main Render Loop (60-120fps hardware accelerated)
     */
    const render = (timestamp) => {
      const elapsed = timestamp - startTimeRef.current;
      const currentCx = width / 2;
      const currentCy = height / 2;

      // Dark obsidian space background with deep nebula depth gradient
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 4, 10, 0.28)'; // Subtle motion blur trail
      ctx.fillRect(0, 0, width, height);

      // Additive blending for intense cosmic luminous glow
      ctx.globalCompositeOperation = 'lighter';

      // 1. PHASE CALCULATION
      let currentPhase = 'vortex';
      let morphProgress = 0; // 0 to 1

      if (elapsed > VORTEX_DURATION + MORPH_DURATION) {
        currentPhase = 'formed';
        morphProgress = 1;
      } else if (elapsed > VORTEX_DURATION) {
        currentPhase = 'morph';
        // Smooth quintic easing for fluid magnetic convergence
        const t = (elapsed - VORTEX_DURATION) / MORPH_DURATION;
        morphProgress = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
      }

      // Draw faint central galactic core glow
      if (currentPhase === 'vortex' || morphProgress < 0.6) {
        const coreAlpha = (1 - morphProgress) * 0.45;
        const coreGrad = ctx.createRadialGradient(currentCx, currentCy, 0, currentCx, currentCy, 240);
        coreGrad.addColorStop(0, `rgba(0, 240, 255, ${coreAlpha})`);
        coreGrad.addColorStop(0.3, `rgba(59, 130, 246, ${coreAlpha * 0.5})`);
        coreGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(currentCx, currentCy, 240, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. PARTICLE SIMULATION & RENDERING
      const pts = particlesRef.current;
      const len = pts.length;

      for (let i = 0; i < len; i++) {
        const p = pts[i];

        if (isExiting) {
          // Hyperdrive scatter on exit
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(0, p.alpha - 0.025);
        } else if (currentPhase === 'vortex') {
          // Galaxy Swirl: Logarithmic spiral vortex motion
          p.baseAngle += p.angularSpeed;
          p.r = Math.max(8, p.r - 0.08); // Slight inward gravitational pull
          const tiltCos = 0.65; // Perspective tilt ratio

          const vortexX = currentCx + Math.cos(p.baseAngle) * p.r;
          const vortexY = currentCy + Math.sin(p.baseAngle) * (p.r * tiltCos);

          p.x = vortexX;
          p.y = vortexY;
        } else if (currentPhase === 'morph') {
          // Morphing Stage: Spring physics pulling particles from spiral to text target
          if (p.tx !== null) {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            // Magnetic force with curl noise
            const springForce = 0.085 + morphProgress * 0.08;
            p.vx = (p.vx + dx * springForce) * 0.78;
            p.vy = (p.vy + dy * springForce) * 0.78;

            p.x += p.vx;
            p.y += p.vy;
          }
        } else if (currentPhase === 'formed') {
          // Formed Text Stage: Ambient celestial shimmer & magnetic mouse repulsion
          p.shimmerOffset += p.shimmerSpeed;
          const floatX = Math.sin(p.shimmerOffset) * 0.8;
          const floatY = Math.cos(p.shimmerOffset * 0.8) * 0.8;

          if (p.tx !== null) {
            let targetX = p.tx + floatX;
            let targetY = p.ty + floatY;

            // Interactive mouse repulsion/ripple
            if (mousePos.active) {
              const mdx = targetX - mousePos.x;
              const mdy = targetY - mousePos.y;
              const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
              const maxDist = 90;
              if (mdist < maxDist && mdist > 0) {
                const repulse = (1 - mdist / maxDist) * 35;
                targetX += (mdx / mdist) * repulse;
                targetY += (mdy / mdist) * repulse;
              }
            }

            p.x += (targetX - p.x) * 0.22;
            p.y += (targetY - p.y) * 0.22;
          }
        }

        // Twinkle factor
        const twinkle = Math.sin(elapsed * 0.003 + p.id) * 0.25;
        const currentAlpha = Math.min(1, Math.max(0.1, p.alpha + twinkle));

        // Render Glowing Core Particle
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Render Radiant Glow Halo for brightest particles
        if (p.id % 4 === 0) {
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowSize);
          glowGrad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentAlpha * 0.6})`);
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.glowSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    // Mouse & Touch interaction listeners
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY, active: true });
    };

    const handleMouseLeave = () => {
      setMousePos((prev) => ({ ...prev, active: false }));
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY, active: true });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      clearTimeout(taglineTimer);
      clearTimeout(autoSkipTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [sampleTextGrid, title, particleCount, autoSkipDuration, handleExit]);

  return (
    <div
      ref={containerRef}
      onClick={handleExit}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#02040a] select-none overflow-hidden cursor-pointer transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      } ${className}`}
      aria-label="Mazdoor Mitra Cosmic Splash Intro"
      role="banner"
    >
      {/* 1. WebGL/Canvas Particle Viewport */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
      />

      {/* 2. Top-Right "Skip Intro" Button */}
      {showSkipButton && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExit();
            }}
            className="group px-4 py-2 rounded-full bg-slate-950/70 hover:bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 hover:text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <span>Skip Intro</span>
            <span className="text-cyan-400 text-[11px] font-mono group-hover:translate-x-1 transition-transform inline-flex items-center">
              &rarr;
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400 group-hover:text-slate-300 font-normal">
              Click to enter platform
            </span>
          </button>
        </div>
      )}

      {/* 3. Celestial Lighting Backdrop Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2, 4, 10, 0.75) 85%, #02040a 100%)',
        }}
      />

      {/* 4. Tagline & Enter Platform Prompt (Positioned directly below the particle text) */}
      <div className="relative z-20 flex flex-col items-center justify-center mt-36 sm:mt-48 px-6 text-center pointer-events-none">
        {/* Glowing Tagline */}
        <div
          className={`transition-all duration-1000 ease-out transform ${
            taglineVisible
              ? 'opacity-100 translate-y-0 filter-none'
              : 'opacity-0 translate-y-6 blur-sm'
          }`}
        >
          <p className="text-sm sm:text-lg md:text-xl font-medium tracking-wide bg-gradient-to-r from-cyan-300 via-sky-100 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.5)]">
            {tagline}
          </p>

          {/* Hindi/Telugu Multilingual Subtitle Accent */}
          <div className="flex items-center justify-center gap-2 mt-2 text-[11px] sm:text-xs text-cyan-400/70 font-medium">
            <span>काम पाएं, कारीगर पाएं</span>
            <span className="inline-block w-1 h-1 rounded-full bg-cyan-400/50" />
            <span>పని పొందండి, కార్మికులను కనుగొనండి</span>
          </div>
        </div>

        {/* Subtle "Tap anywhere to continue" pulsing hint */}
        <div
          className={`mt-10 transition-all duration-1000 delay-500 ease-out flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase text-cyan-300/60 ${
            taglineVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span>Tap anywhere to enter</span>
        </div>
      </div>
    </div>
  );
}
