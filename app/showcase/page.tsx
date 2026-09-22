'use client';

import React, { useEffect, useState } from 'react';
import ShowcaseClient from './ShowcaseClient';
import type { ShowcaseProject } from './ShowcaseClient';
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton';

/**
 * /showcase — Vitrina Pública de Proyectos Estudiantiles
 * Client component: fetch data from API (Blob) at runtime
 */
export default function ShowcasePage() {
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [semesterLabel, setSemesterLabel] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/projects/public')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setProjects(data.projects ?? []);
          setCourses(data.courses ?? []);
          setSemesterLabel(data.semesterLabel ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-canvas px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <SkeletonCards count={6} />
        </div>
      </div>
    );
  }

  return (
    <ShowcaseClient
      projects={projects}
      semesterLabel={semesterLabel}
      courses={courses}
    />
  );
}
