'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface StatCardProps {
  /** Main number to display */
  value: number;
  /** Short label below the number */
  label: string;
  /** Optional description or secondary text */
  description?: string;
  /** Icon (emoji or ReactNode) */
  icon?: React.ReactNode;
  /** Accent color for the number — Tailwind class */
  color?: string;
  /** Optional detail rows below the main stat */
  details?: { label: string; value: string | number; color?: string }[];
  /** Skeleton loading state */
  loading?: boolean;
}

/**
 * StatCard — Dashboard metric card with animated counter
 * Fase 20 — Inspired by Vercel/Linear dashboards
 * Features: spring-animated count-up, skeleton loading, detail breakdown
 */
export default function StatCard({
  value,
  label,
  description,
  icon,
  color = 'text-white',
  details,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="h-9 w-16 rounded bg-white/[0.06] mb-1" />
        <div className="h-3 w-24 rounded bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/[0.1] p-5 transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-white/35 uppercase tracking-wider">{label}</p>
        {icon && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] text-base">
            {icon}
          </div>
        )}
      </div>

      {/* Animated number */}
      <AnimatedNumber value={value} className={`text-3xl font-bold tracking-tight ${color}`} />

      {/* Description */}
      {description && (
        <p className="text-xs text-white/30 mt-1">{description}</p>
      )}

      {/* Detail breakdown */}
      {details && details.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-1.5">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[11px] text-white/30">{d.label}</span>
              <span className={`text-[11px] font-medium ${d.color ?? 'text-white/50'}`}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Animated Number Sub-component ─── */

function AnimatedNumber({ value, className }: { value: number; className: string }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  if (!isClient) {
    return <p className={className}>{value}</p>;
  }

  return <p className={className}>{displayValue}</p>;
}
