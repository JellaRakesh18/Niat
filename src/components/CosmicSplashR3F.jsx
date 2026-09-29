'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Custom GLSL Shader for Cosmic Galaxy Swirl & Particle Morphing
 */
const ParticleShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMorphProgress: { value: 0 },
    uExitProgress: { value: 0 },
    uPixelRatio: { value: 2 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMorphProgress;
    uniform float uExitProgress;
    uniform float uPixelRatio;

    attribute vec3 aTargetPosition;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aAngle;
    attribute float aDistance;
    attribute float aSpeed;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;

      // 1. Galaxy Vortex Spiral Coordinates
      float currentAngle = aAngle + uTime * aSpeed;
      float r = aDistance;
      vec3 vortexPos = vec3(
        cos(currentAngle) * r,
        sin(currentAngle) * (r * 0.65), // 3D disk tilt
        sin(currentAngle * 2.0) * (r * 0.15)
      );

      // 2. Smooth Interpolation to Text Target
      // Quintic ease in-out
      float t = clamp(uMorphProgress, 0.0, 1.0);
      float ease = t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 5.0) / 2.0;

      vec3 pos = mix(vortexPos, aTargetPosition, ease);

      // Ambient celestial shimmer when formed
      if (uMorphProgress > 0.8) {
        pos.x += sin(uTime * 3.0 + aAngle) * 0.02;
        pos.y += cos(uTime * 2.5 + aDistance) * 0.02;
      }

      // Hyperdrive exit scatter
      if (uExitProgress > 0.0) {
        vec3 dir = normalize(pos);
        pos += dir * uExitProgress * 15.0;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Distance attenuation & DPR scaling
      gl_PointSize = aSize * uPixelRatio * (28.0 / -mvPosition.z);
      
      // Dynamic twinkle
      vAlpha = (0.75 + 0.25 * sin(uTime * 4.0 + aAngle)) * (1.0 - uExitProgress);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Circular soft particle sprite with radiant glow falloff
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Smooth radial energy gradient
      float intensity = pow(1.0 - dist * 2.0, 1.6);
      gl_FragColor = vec4(vColor, vAlpha * intensity);
    }
  `,
};

/**
 * 3D Particle Galaxy Points Mesh Component
 */
function CosmicParticles({ morphProgress, exitProgress, title = 'MAZDOOR MITRA' }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const COUNT = 3500;

  // Precompute Vortex Spiral and Offscreen 3D Text coordinates
  const [positions, targets, colors, sizes, angles, distances, speeds] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const tar = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);
    const ang = new Float32Array(COUNT);
    const dist = new Float32Array(COUNT);
    const spd = new Float32Array(COUNT);

    // Rasterize text offscreen to get 3D coordinates
    let sampledPoints = [];
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 84px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 512, 256);

      const data = ctx.getImageData(0, 0, 1024, 512).data;
      for (let y = 0; y < 512; y += 4) {
        for (let x = 0; x < 1024; x += 4) {
          const idx = (y * 1024 + x) * 4;
          if (data[idx + 3] > 140) {
            sampledPoints.push({
              x: (x - 512) * 0.012,
              y: -(y - 256) * 0.012,
              z: (Math.random() - 0.5) * 0.1,
            });
          }
        }
      }
    }

    const COLOR_PALETTE = [
      new THREE.Color('#00f0ff'), // Electric Cyan
      new THREE.Color('#22d3ee'), // Sky Cyan
      new THREE.Color('#3b82f6'), // Radiant Blue
      new THREE.Color('#6366f1'), // Royal Indigo
      new THREE.Color('#ffffff'), // Diamond White
    ];

    const arms = 3;
    for (let i = 0; i < COUNT; i++) {
      const arm = i % arms;
      const armOffset = (Math.PI * 2 / arms) * arm;
      const r = 0.4 + Math.pow(Math.random(), 1.6) * 4.8;
      const angle = armOffset + Math.log(r + 1.0) * 2.8 + (Math.random() - 0.5) * 0.5;

      pos[i * 3 + 0] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * (r * 0.65);
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

      // Assign target text point
      if (sampledPoints.length > 0) {
        const pt = sampledPoints[i % sampledPoints.length];
        tar[i * 3 + 0] = pt.x + (i >= sampledPoints.length ? (Math.random() - 0.5) * 0.3 : 0);
        tar[i * 3 + 1] = pt.y + (i >= sampledPoints.length ? (Math.random() - 0.5) * 0.3 : 0);
        tar[i * 3 + 2] = pt.z;
      }

      // Color selection
      const chosenColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      col[i * 3 + 0] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;

      sz[i] = Math.random() * 2.5 + 1.0;
      ang[i] = angle;
      dist[i] = r;
      spd[i] = (0.35 + 0.65 / (r * 0.5 + 1.0)) * 0.8;
    }

    return [pos, tar, col, sz, ang, dist, spd];
  }, [title]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      materialRef.current.uniforms.uMorphProgress.value = morphProgress;
      materialRef.current.uniforms.uExitProgress.value = exitProgress;
      materialRef.current.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPosition" args={[targets, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAngle" args={[angles, 1]} />
        <bufferAttribute attach="attributes-aDistance" args={[distances, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        args={[ParticleShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * CosmicSplashR3F Component
 * Full-screen Cosmic Particle Galaxy with R3F & Framer Motion
 */
export default function CosmicSplashR3F({
  title = 'MAZDOOR MITRA',
  tagline = 'Find work, find workers, build a better future.',
  onComplete = () => {},
  autoSkipDuration = 6800,
}) {
  const [morphProgress, setMorphProgress] = useState(0);
  const [exitProgress, setExitProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    // 1. Swirl vortex for 2.4s, then begin morphing
    const morphStartTimer = setTimeout(() => {
      let start = performance.now();
      const duration = 2000;
      const animateMorph = (now) => {
        const p = Math.min(1, (now - start) / duration);
        setMorphProgress(p);
        if (p < 1) requestAnimationFrame(animateMorph);
      };
      requestAnimationFrame(animateMorph);
    }, 2400);

    // 2. Reveal Tagline at 4.2s
    const taglineTimer = setTimeout(() => {
      setShowTagline(true);
    }, 4200);

    // 3. Auto dismiss at timeout
    const autoDismissTimer = setTimeout(() => {
      triggerExit();
    }, autoSkipDuration);

    return () => {
      clearTimeout(morphStartTimer);
      clearTimeout(taglineTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [autoSkipDuration]);

  const triggerExit = () => {
    if (isExiting) return;
    setIsExiting(true);

    let start = performance.now();
    const duration = 650;
    const animateExit = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setExitProgress(p);
      if (p < 1) requestAnimationFrame(animateExit);
      else onComplete?.();
    };
    requestAnimationFrame(animateExit);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          onClick={triggerExit}
          className="fixed inset-0 z-[9999] bg-[#02040a] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
        >
          {/* Top Right Skip Button */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerExit();
              }}
              className="group px-4 py-2 rounded-full bg-slate-950/70 hover:bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 hover:text-white text-xs font-semibold backdrop-blur-md transition shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Skip Intro</span>
              <span className="text-cyan-400 text-[11px] group-hover:translate-x-1 transition-transform">&rarr;</span>
              <span className="hidden sm:inline text-slate-400 text-[11px]">Click to enter platform</span>
            </button>
          </div>

          {/* WebGL R3F 3D Canvas */}
          <Canvas
            camera={{ position: [0, 0, 7.5], fov: 60 }}
            gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
            className="w-full h-full"
          >
            <color attach="background" args={['#02040a']} />
            <CosmicParticles
              morphProgress={morphProgress}
              exitProgress={exitProgress}
              title={title}
            />
          </Canvas>

          {/* Vignette Depth Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 45%, rgba(2, 4, 10, 0.8) 85%, #02040a 100%)',
            }}
          />

          {/* Tagline Reveal */}
          <div className="absolute bottom-20 sm:bottom-28 z-20 flex flex-col items-center px-4 text-center pointer-events-none">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={showTagline ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="text-sm sm:text-lg md:text-xl font-medium tracking-wide bg-gradient-to-r from-cyan-300 via-sky-100 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.5)]"
            >
              {tagline}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={showTagline ? { opacity: 0.7 } : { opacity: 0 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="text-xs text-cyan-400/80 mt-2 font-mono"
            >
              काम पाएं, कारीगर पाएं • పని పొందండి, కార్మికులను కనుగొనండి
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
