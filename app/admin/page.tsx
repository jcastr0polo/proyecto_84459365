'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';

interface DashboardStats {
  activeSemester: string | null;
  totalCourses: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [semRes, courseRes] = await Promise.all([
          fetch('/api/semesters'),
          fetch('/api/courses'),
        ]);
        const semData = semRes.ok ? await semRes.json() : { semesters: [] };
        const courseData = courseRes.ok ? await courseRes.json() : { courses: [] };
        const active = semData.semesters?.find((s: { isActive: boolean }) => s.isActive);
        setStats({
          activeSemester: active?.label ?? null,
          totalCourses: courseData.courses?.length ?? 0,
        });
      } catch {
        setStats({ activeSemester: null, totalCourses: 0 });
      }
    }
    load();
  }, []);

  if (!stats) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Resumen general de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card padding="lg">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Semestre Activo</p>
          {stats.activeSemester ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>{stats.activeSemester}</Badge>
            </div>
          ) : (
            <p className="text-sm text-white/60">Ninguno activo</p>
          )}
        </Card>

        <Card padding="lg">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Cursos Totales</p>
          <p className="text-3xl font-bold text-white">{stats.totalCourses}</p>
        </Card>

        <Card padding="lg">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Estudiantes</p>
          <p className="text-sm text-white/40">Próximamente — Fase 9</p>
        </Card>
      </div>
    </div>
  );
}
