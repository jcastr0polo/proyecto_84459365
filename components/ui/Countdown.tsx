'use client';

import React, { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
  showExpired?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

/**
 * Countdown — Cuenta regresiva hasta una fecha
 * Actualiza cada segundo, muestra urgencia visual
 */
export default function Countdown({
  targetDate,
  className = '',
  compact = false,
  showExpired = true,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calculateTimeLeft(targetDate);
      setTimeLeft(tl);
      if (tl.expired) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    if (!showExpired) return null;
    return (
      <span className={`text-red-400 font-medium ${className}`}>
        Plazo vencido
      </span>
    );
  }

  // Urgency colors
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;
  const isWarning = timeLeft.days <= 1;
  const colorClass = isUrgent
    ? 'text-red-400'
    : isWarning
      ? 'text-amber-400'
      : 'text-white/70';

  if (compact) {
    if (timeLeft.days > 0) {
      return (
        <span className={`${colorClass} ${className}`}>
          {timeLeft.days}d {timeLeft.hours}h
        </span>
      );
    }
    return (
      <span className={`${colorClass} ${className}`}>
        {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {timeLeft.days > 0 && (
        <Unit value={timeLeft.days} label="d" colorClass={colorClass} />
      )}
      <Unit value={timeLeft.hours} label="h" colorClass={colorClass} />
      <Unit value={timeLeft.minutes} label="m" colorClass={colorClass} />
      <Unit value={timeLeft.seconds} label="s" colorClass={colorClass} />
    </div>
  );
}

function Unit({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-baseline gap-0.5 font-mono text-sm ${colorClass}`}>
      <span className="font-semibold">{String(value).padStart(2, '0')}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </span>
  );
}
