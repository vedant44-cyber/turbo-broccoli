"use client";

import { useEffect, useState } from 'react';

const COLORS = ['#00ff88', '#22d3ee', '#ff00ff', '#facc15', '#00ffff', '#ff5e00'];
const PARTICLE_COUNT = 50;

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Generate particles
    const generated: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        size: 6 + Math.random() * 8,
      });
    }
    setParticles(generated);

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      
      {/* Central burst effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-64 h-64 rounded-full bg-green-500/30 animate-ping" />
      </div>
      
      {/* Victory text */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce">
        <h2 className="text-6xl font-bold text-green-400 font-[family-name:var(--font-orbitron)] text-center drop-shadow-[0_0_30px_rgba(0,255,136,0.8)]">
          SECURE!
        </h2>
        <p className="text-xl text-green-300 text-center mt-2 tracking-[0.5em] uppercase">
          System Integrity Verified
        </p>
      </div>
    </div>
  );
}
