'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { formatDateShort } from '@/lib/dateUtils';
import { Upload, CheckCircle2, UserPlus, FileText, Rocket, Inbox } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'submission' | 'grade' | 'enrollment' | 'activity' | 'project';
  title: string;
  description: string;
  timestamp: string;
  courseName?: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; dotColor: string }> = {
  submission: { icon: <Upload className="w-3 h-3" />, color: 'text-blue-400', dotColor: 'bg-blue-400' },
  grade: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  enrollment: { icon: <UserPlus className="w-3 h-3" />, color: 'text-purple-400', dotColor: 'bg-purple-400' },
  activity: { icon: <FileText className="w-3 h-3" />, color: 'text-cyan-400', dotColor: 'bg-cyan-400' },
  project: { icon: <Rocket className="w-3 h-3" />, color: 'text-amber-400', dotColor: 'bg-amber-400' },
};

/**
 * ActivityTimeline — Recent activity feed for admin dashboard
 * Fase 20 — Vertical timeline of latest platform events
 */
export default function ActivityTimeline({ events, loading = false }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-foreground/[0.06] flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-48 rounded bg-foreground/[0.06]" />
              <div className="h-2.5 w-32 rounded bg-foreground/[0.04]" />
            </div>
            <div className="h-2.5 w-12 rounded bg-foreground/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Inbox className="w-6 h-6 text-faint mx-auto mb-2" />
        <p className="text-xs text-subtle">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-foreground/[0.04]" />

      <div className="space-y-3">
        {events.map((event, i) => {
          const config = typeConfig[event.type] ?? typeConfig.activity;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="flex items-start gap-3 relative"
            >
              {/* Dot */}
              <div className="w-6 h-6 rounded-full bg-foreground/[0.03] border border-foreground/[0.06] flex items-center justify-center flex-shrink-0 z-10">
                <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs text-muted leading-relaxed">
                  <span className="mr-1">{config.icon}</span>
                  {event.title}
                </p>
                <p className="text-[10px] text-faint mt-0.5">
                  {event.description}
                  {event.courseName && (
                    <span className="text-faint"> · {event.courseName}</span>
                  )}
                </p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-faint flex-shrink-0 pt-1">
                {formatRelativeTime(event.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  try {
    const now = Date.now();
    const date = new Date(isoDate).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return formatDateShort(isoDate);
  } catch {
    return '';
  }
}

export type { TimelineEvent };
