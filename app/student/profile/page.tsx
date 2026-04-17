'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Course, Enrollment, SafeUser, Semester } from '@/lib/types';

interface EnrolledCourse {
  course: Course;
  enrollment: Enrollment;
}

const categoryBadge: Record<string, { variant: 'programming' | 'design' | 'management' | 'leadership' | 'other'; label: string }> = {
  programming: { variant: 'programming', label: 'Programación' },
  design: { variant: 'design', label: 'Diseño' },
  management: { variant: 'management', label: 'Gerencia' },
  leadership: { variant: 'leadership', label: 'Liderazgo' },
  other: { variant: 'other', label: 'Otro' },
};

/**
 * Student Profile Page
 * Fase 21 — Shows personal data, enrolled courses, link to change password
 */
export default function StudentProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, semRes, courseRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/semesters'),
        fetch('/api/courses'),
      ]);

      const meData = meRes.ok ? await meRes.json() : null;
      setUser(meData?.user ?? null);
      if (!meData?.user) return;

      const semData = semRes.ok ? await semRes.json() : { semesters: [] };
      setSemester(semData.semesters?.find((s: Semester) => s.isActive) ?? null);

      const allCourses: Course[] = courseRes.ok ? (await courseRes.json()).courses ?? [] : [];

      // Check enrollments for each course
      const enrolled: EnrolledCourse[] = [];
      const promises = allCourses.map(async (course) => {
        const enrRes = await fetch(`/api/courses/${course.id}/enrollments`);
        if (!enrRes.ok) return;
        const enrollments: Enrollment[] = (await enrRes.json()).enrollments ?? [];
        const mine = enrollments.find(
          (e) => e.studentId === meData.user.id && e.status === 'active'
        );
        if (mine) enrolled.push({ course, enrollment: mine });
      });
      await Promise.all(promises);
      setEnrolledCourses(enrolled);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <PageLoader />;
  if (!user) return null;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
        Mi Perfil
      </h1>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-xl font-bold text-cyan-400 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{user.firstName} {user.lastName}</h2>
            <p className="text-sm text-white/40">{user.email}</p>
            <Badge variant="info" size="sm">Estudiante</Badge>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoField label="Nombre" value={`${user.firstName} ${user.lastName}`} />
          <InfoField label="Email" value={user.email} />
          <InfoField label="Documento" value={user.documentNumber} />
          <InfoField label="Teléfono" value={user.phone ?? 'No registrado'} muted={!user.phone} />
          <InfoField label="Estado" value={user.isActive ? 'Activo' : 'Inactivo'} />
          <InfoField
            label="Último acceso"
            value={user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })
              : 'Sin registro'
            }
          />
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/change-password')}
          >
            🔒 Cambiar Contraseña
          </Button>
        </div>
      </motion.div>

      {/* Enrolled courses */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
          Cursos Inscritos ({enrolledCourses.length})
        </h2>

        {enrolledCourses.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No estás inscrito en ningún curso.</p>
        ) : (
          <div className="space-y-3">
            {enrolledCourses.map(({ course, enrollment }) => {
              const badge = categoryBadge[course.category] ?? categoryBadge.other;
              return (
                <button
                  key={course.id}
                  onClick={() => router.push(`/student/courses/${course.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-white/[0.06]
                             bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]
                             transition-all cursor-pointer text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </div>
                    <p className="text-sm font-medium text-white/80 line-clamp-1">{course.name}</p>
                    <p className="text-[11px] text-white/25 font-mono">{course.code}</p>
                  </div>
                  <div className="shrink-0 text-right ml-3">
                    <p className="text-[10px] text-white/20">Inscrito</p>
                    <p className="text-[11px] text-white/30">
                      {new Date(enrollment.enrolledAt).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short',
                      })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {semester && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/20">
              Semestre activo: {semester.label ?? semester.id}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function InfoField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${muted ? 'text-white/25 italic' : 'text-white/70'}`}>{value}</p>
    </div>
  );
}
