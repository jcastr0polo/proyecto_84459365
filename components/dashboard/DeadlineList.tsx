'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DeadlineItem {
  id: string;
  title: string;
  courseName: string;
  courseCode: string;
  dueDate: string;
  /** How many days until due (negative = overdue) */
  daysLeft: number;
  status: 'draft' | 'published' | 'closed';
  submissionCount: number;
  studentCount: number;
}

interface DeadlineListProps {
  deadlines: DeadlineItem[];
  loading?: boolean;
  onItemClick?: (activityId: string, courseId: string) => void;
}

/**
 * DeadlineList — Upcoming activity deadlines with urgency indicators
 * Fase 20 — Shows time-proximity color coding: red (<2d), amber (<5d), green (>5d)
 */
export default function DeadlineList({ deadlines, loading = false, onItemClick }: DeadlineListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] animate-pulse">
            <div className="w-1 h-10 rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 rounded bg-white/[0.06]" />
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
            </div>
            <div className="h-6 w-14 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-xs text-white/30">Sin vencimientos próximos</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {deadlines.map((d, i) => {
        const urgency = getUrgency(d.daysLeft);
        const completionRate = d.studentCount > 0
          ? Math.round((d.submissionCount / d.studentCount) * 100)
          : 0;

        return (
          <motion.button
            key={d.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={() => onItemClick?.(d.id, '')}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.015] hover:bg-white/[0.04]
                       border border-transparent hover:border-white/[0.06]
                       transition-all duration-200 cursor-pointer group text-left"
          >
            {/* Urgency bar */}
            <div className={`w-1 self-stretch rounded-full ${urgency.barColor} flex-shrink-0`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white/80 font-medium truncate group-hover:text-white transition-colors">
                  {d.title}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-white/20">{d.courseCode}</span>
                <span className="text-[10px] text-white/15">·</span>
                <span className="text-[10px] text-white/25">{d.courseName}</span>
              </div>
            </div>

            {/* Completion indicator */}
            <div className="flex-shrink-0 text-right">
              <span className="text-[10px] text-white/20">{d.submissionCount}/{d.studentCount}</span>
              <div className="w-12 h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500/40 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Days badge */}
            <div className={`flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-semibold ${urgency.badgeBg} ${urgency.badgeText}`}>
              {urgency.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function getUrgency(daysLeft: number) {
  if (daysLeft < 0) {
    return {
      barColor: 'bg-red-500',
      badgeBg: 'bg-red-500/15',
      badgeText: 'text-red-400',
      label: `${Math.abs(daysLeft)}d vencida`,
    };
  }
  if (daysLeft === 0) {
    return {
      barColor: 'bg-red-500',
      badgeBg: 'bg-red-500/15',
      badgeText: 'text-red-400',
      label: 'Hoy',
    };
  }
  if (daysLeft <= 2) {
    return {
      barColor: 'bg-red-400',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-400',
      label: `${daysLeft}d`,
    };
  }
  if (daysLeft <= 5) {
    return {
      barColor: 'bg-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeText: 'text-amber-400',
      label: `${daysLeft}d`,
    };
  }
  return {
    barColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    label: `${daysLeft}d`,
  };
}

export type { DeadlineItem };
