'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Clock } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface CourseCardProps {
  id: string;
  name: string;
  code: string;
  category: 'programming' | 'design' | 'management' | 'leadership' | 'other';
  studentCount: number;
  activityCount: number;
  pendingSubmissions: number;
  schedule: { dayOfWeek: string; startTime: string; endTime: string; room?: string }[];
  onClick: () => void;
  index?: number;
  loading?: boolean;
}

const categoryBadge: Record<string, { variant: 'programming' | 'design' | 'management' | 'leadership' | 'other'; label: string }> = {
  programming: { variant: 'programming', label: 'Programación' },
  design: { variant: 'design', label: 'Diseño' },
  management: { variant: 'management', label: 'Gerencia' },
  leadership: { variant: 'leadership', label: 'Liderazgo' },
  other: { variant: 'other', label: 'Otro' },
};

const categoryGradient: Record<string, string> = {
  programming: 'from-cyan-500/[0.06] to-blue-500/[0.02]',
  design: 'from-purple-500/[0.06] to-pink-500/[0.02]',
  management: 'from-amber-500/[0.06] to-orange-500/[0.02]',
  leadership: 'from-emerald-500/[0.06] to-teal-500/[0.02]',
  other: 'from-white/[0.04] to-white/[0.01]',
};

/**
 * CourseCard — Rich course card for admin dashboard
 * Fase 20 — Shows key metrics at a glance, category gradient, click to navigate
 */
export default function CourseCard({
  name,
  code,
  category,
  studentCount,
  activityCount,
  pendingSubmissions,
  schedule,
  onClick,
  index = 0,
  loading = false,
}: CourseCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5 animate-pulse">
        <div className="h-3 w-24 rounded bg-foreground/[0.06] mb-3" />
        <div className="h-5 w-40 rounded bg-foreground/[0.06] mb-4" />
        <div className="flex gap-4">
          <div className="h-3 w-16 rounded bg-foreground/[0.04]" />
          <div className="h-3 w-16 rounded bg-foreground/[0.04]" />
          <div className="h-3 w-16 rounded bg-foreground/[0.04]" />
        </div>
      </div>
    );
  }

  const badge = categoryBadge[category] ?? categoryBadge.other;
  const gradient = categoryGradient[category] ?? categoryGradient.other;
  const dayShort: Record<string, string> = {
    lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', jueves: 'Jue',
    viernes: 'Vie', sábado: 'Sáb',
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`w-full text-left rounded-xl border border-foreground/[0.06] hover:border-foreground/[0.12]
                  bg-gradient-to-br ${gradient} p-5 transition-colors duration-200 cursor-pointer group`}
    >
      {/* Code + Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-faint tracking-wider">{code}</span>
        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
      </div>

      {/* Name */}
      <h3 className="text-base font-semibold text-foreground group-hover:text-cyan-50 transition-colors leading-tight mb-3">
        {name}
      </h3>

      {/* Quick stats */}
      <div className="flex items-center gap-4 mb-3">
        <MiniStat icon={<Users className="w-3 h-3" />} value={studentCount} label="estudiantes" />
        <MiniStat icon={<FileText className="w-3 h-3" />} value={activityCount} label="actividades" />
        {pendingSubmissions > 0 && (
          <MiniStat icon={<Clock className="w-3 h-3" />} value={pendingSubmissions} label="pendientes" highlight />
        )}
      </div>

      {/* Schedule */}
      {schedule.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-foreground/[0.04]">
          {schedule.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] text-subtle bg-foreground/[0.03] px-2 py-0.5 rounded"
            >
              <span className="font-medium text-subtle">{dayShort[s.dayOfWeek] ?? s.dayOfWeek}</span>
              {s.startTime}-{s.endTime}
              {s.room && <span className="text-faint">· {s.room}</span>}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}

function MiniStat({ icon, value, label, highlight }: { icon: React.ReactNode; value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-subtle">{icon}</span>
      <span className={`text-xs font-semibold ${highlight ? 'text-amber-400' : 'text-muted'}`}>{value}</span>
      <span className="text-[10px] text-faint">{label}</span>
    </div>
  );
}
