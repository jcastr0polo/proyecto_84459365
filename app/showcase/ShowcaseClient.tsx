'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

export interface ShowcaseProject {
  id: string;
  projectName: string;
  description?: string;
  githubUrl: string;
  vercelUrl?: string;
  figmaUrl?: string;
  studentName: string;
  courseName: string;
  courseId: string;
}

interface ShowcaseClientProps {
  projects: ShowcaseProject[];
  semesterLabel: string;
  courses: { id: string; name: string }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
  },
};

/**
 * ShowcaseClient — Animated grid of featured student projects
 * Fase 19 — Public showcase with framer-motion stagger
 */
export default function ShowcaseClient({ projects, semesterLabel, courses }: ShowcaseClientProps) {
  const [courseFilter, setCourseFilter] = useState('all');

  const filtered = useMemo(() => {
    if (courseFilter === 'all') return projects;
    return projects.filter((p) => p.courseId === courseFilter);
  }, [projects, courseFilter]);

  return (
    <div className="min-h-screen bg-black">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs font-medium text-cyan-400/60 uppercase tracking-[0.2em] mb-3">
              Vitrina de Proyectos
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Proyectos{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
                Estudiantiles
              </span>
            </h1>
            <p className="text-white/40 mt-4 max-w-xl mx-auto leading-relaxed">
              Proyectos fullstack destacados construidos por estudiantes durante el semestre{' '}
              <span className="text-white/60">{semesterLabel}</span>, utilizando Next.js, TypeScript y asistentes de IA.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-8">
              <Stat value={projects.length} label="Proyectos" />
              <div className="w-px h-8 bg-white/[0.08]" />
              <Stat value={courses.length} label="Cursos" />
              <div className="w-px h-8 bg-white/[0.08]" />
              <Stat value={new Set(projects.map((p) => p.studentName)).size} label="Estudiantes" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          <button
            onClick={() => setCourseFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
              courseFilter === 'all'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-white/35 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.12]'
            }`}
          >
            Todos ({projects.length})
          </button>
          {courses.map((c) => {
            const count = projects.filter((p) => p.courseId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setCourseFilter(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  courseFilter === c.id
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-white/35 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.12]'
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* ─── Projects Grid ─── */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Rocket className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No hay proyectos destacados aún</p>
            <p className="text-white/15 text-xs mt-1">Los proyectos aparecerán aquí cuando el docente los destaque</p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-white/15">
            Plataforma de Gestión Académica · {semesterLabel} · Construido con Next.js + TypeScript + Vercel
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── ProjectCard ─── */

function ProjectCard({ project }: { project: ShowcaseProject }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl overflow-hidden"
    >
      {/* Card background with gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative rounded-2xl border border-white/[0.06] group-hover:border-white/[0.12] bg-white/[0.02] group-hover:bg-white/[0.04] backdrop-blur-sm p-6 transition-all duration-300">
        {/* Course tag */}
        <p className="text-[10px] font-medium text-cyan-400/50 uppercase tracking-[0.15em] mb-3">
          {project.courseName}
        </p>

        {/* Project name */}
        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-50 transition-colors leading-tight">
          {project.projectName}
        </h3>

        {/* Student name */}
        <p className="text-xs text-white/30 mt-1">
          por <span className="text-white/50">{project.studentName}</span>
        </p>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-white/35 mt-3 leading-relaxed line-clamp-3 group-hover:text-white/50 transition-colors">
            {project.description}
          </p>
        )}

        {/* Tech hint dots */}
        <div className="flex gap-1.5 mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40" title="Next.js" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40" title="TypeScript" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" title="Vercel" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-white/[0.04]">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium
                       border border-white/[0.08] text-white/50
                       hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15]
                       transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>

          {project.vercelUrl ? (
            <a
              href={project.vercelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium
                         bg-gradient-to-r from-cyan-500/20 to-cyan-400/10 border border-cyan-500/20 text-cyan-400
                         hover:from-cyan-500/30 hover:to-cyan-400/20 hover:text-cyan-300
                         transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L24 22H0L12 1Z" />
              </svg>
              Ver Demo
            </a>
          ) : (
            <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-white/[0.04] text-white/15">
              Sin demo
            </div>
          )}

          {project.figmaUrl && (
            <a
              href={project.figmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2.5 rounded-xl text-xs font-medium
                         border border-white/[0.08] text-white/40
                         hover:bg-white/[0.06] hover:text-purple-400 hover:border-purple-500/20
                         transition-all"
              title="Figma"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5zM12 2h3.5a3.5 3.5 0 1 1 0 7H12V2zm0 7h3.5a3.5 3.5 0 1 1 0 7H12V9zm-3.5 7A3.5 3.5 0 1 0 12 19.5V16H8.5zm0-7A3.5 3.5 0 0 0 12 12.5V9H8.5a3.5 3.5 0 0 0 0 7z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Stat ─── */

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
    </div>
  );
}
