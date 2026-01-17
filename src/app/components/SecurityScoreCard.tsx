"use client";

import { Vulnerability } from '@/types';
import { calculateSecurityScore } from '@/utils/calculateScore';
import { useEffect, useState } from 'react';

interface SecurityScoreCardProps {
  vulnerabilities: Vulnerability[];
}

export function SecurityScoreCard({ vulnerabilities }: SecurityScoreCardProps) {
  const { score, grade, label, color } = calculateSecurityScore(vulnerabilities);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedDash, setAnimatedDash] = useState(0);

  // Animate score counting up
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Animate circular progress
  useEffect(() => {
    const targetDash = (score / 100) * 283; // 283 is approx circumference of r=45 circle
    const duration = 1500;
    const steps = 60;
    const increment = targetDash / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetDash) {
        setAnimatedDash(targetDash);
        clearInterval(timer);
      } else {
        setAnimatedDash(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="bg-card/50 border border-border p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-20 blur-3xl transition-all"
        style={{ background: `radial-gradient(circle at center, ${color}40, transparent 70%)` }}
      />
      
      <div className="relative z-10 flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/10"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={283 - animatedDash}
              style={{
                filter: `drop-shadow(0 0 8px ${color})`,
                transition: 'stroke-dashoffset 0.1s ease-out'
              }}
            />
          </svg>
          
          {/* Grade in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className="text-4xl font-bold font-[family-name:var(--font-orbitron)]"
              style={{ color, textShadow: `0 0 20px ${color}` }}
            >
              {grade}
            </span>
          </div>
        </div>

        {/* Score Details */}
        <div className="flex flex-col">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Security Score</p>
          <p 
            className="text-4xl font-bold font-mono"
            style={{ color }}
          >
            {animatedScore}<span className="text-lg text-muted-foreground">/100</span>
          </p>
          <p 
            className="text-sm font-bold uppercase tracking-[0.3em] mt-1"
            style={{ color }}
          >
            {label}
          </p>
        </div>
      </div>

      {/* Corner decoration */}
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30 group-hover:border-primary transition-colors" />
    </div>
  );
}
