'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Course, Enrollment, SafeUser } from '@/lib/types';

interface EnrolledStudent {
  student: SafeUser;
  courses: { id: string; name: string; code: string }[];
}

/**
 * Admin — Global Student Search
 * /admin/students
 * Fase 23 — New nav item destination
 */
export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      const courseRes = await fetch('/api/courses');
      const allCourses: Course[] = courseRes.ok ? (await courseRes.json()).courses ?? [] : [];

      const studentMap = new Map<string, EnrolledStudent>();

      const promises = allCourses.map(async (course) => {
        const enrRes = await fetch(`/api/courses/${course.id}/enrollments`);
        if (!enrRes.ok) return;
        const data = await enrRes.json();
        const enrollments = (data.enrollments ?? []) as (Enrollment & { student?: SafeUser })[];

        for (const enr of enrollments) {
          if (!enr.student) continue;
          const existing = studentMap.get(enr.studentId);
          if (existing) {
            if (!existing.courses.some((c) => c.id === course.id)) {
              existing.courses.push({ id: course.id, name: course.name, code: course.code });
            }
          } else {
            studentMap.set(enr.studentId, {
              student: enr.student,
              courses: [{ id: course.id, name: course.name, code: course.code }],
            });
          }
        }
      });

      await Promise.all(promises);
      setStudents(Array.from(studentMap.values()));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) =>
      s.student.firstName.toLowerCase().includes(q) ||
      s.student.lastName.toLowerCase().includes(q) ||
      s.student.email.toLowerCase().includes(q) ||
      s.student.documentNumber.toLowerCase().includes(q) ||
      s.courses.some((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    );
  }, [students, search]);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
            Estudiantes ({students.length})
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Búsqueda global de estudiantes inscritos en todos los cursos
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, email, documento o curso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl
                     border border-white/10 bg-white/5
                     text-white text-sm
                     placeholder-white/20
                     focus:outline-none focus:border-cyan-500/20 focus:ring-1 focus:ring-cyan-500/20
                     transition-all"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-white/30" />}
          title={search ? 'Sin resultados' : 'No hay estudiantes'}
          description={search ? `No se encontraron estudiantes para "${search}"` : 'Aún no hay estudiantes inscritos en ningún curso.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <motion.div
              key={item.student.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="flex items-center justify-between gap-4 p-4 rounded-xl
                         border border-white/10 bg-white/5
                         hover:bg-white/[0.04] hover:border-white/20
                         transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-sm font-bold text-cyan-400 shrink-0">
                  {item.student.firstName.charAt(0)}{item.student.lastName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {item.student.firstName} {item.student.lastName}
                  </p>
                  <p className="text-[11px] text-white/20 truncate">
                    {item.student.email} · {item.student.documentNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/admin/courses/${c.id}`)}
                    className="cursor-pointer"
                    title={c.name}
                  >
                    <Badge variant="neutral" size="sm">{c.code}</Badge>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
