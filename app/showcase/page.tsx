'use client';

import React, { useEffect, useState } from 'react';
import ShowcaseClient from './ShowcaseClient';
import type { ShowcaseProject } from './ShowcaseClient';

/**
 * /showcase — Vitrina Pública de Proyectos Estudiantiles
 * Client component: fetch data from API (Blob) at runtime
 */
export default function ShowcasePage() {
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [semesterLabel, setSemesterLabel] = useState('2026');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/projects/public')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setProjects(data.projects ?? []);
          setCourses(data.courses ?? []);
          setSemesterLabel(data.semesterLabel ?? '2026');
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-foreground/10 border-t-cyan-400" />
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
