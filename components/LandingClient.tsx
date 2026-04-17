'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import AnimatedText from '@/components/AnimatedText';
import type { Course } from '@/lib/types';

/* ─── Section wrapper with scroll animation ─── */
function Section({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Types ─── */
interface LandingClientProps {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
}

/* ─── Constants ─── */
const STACK_ITEMS = [
  { name: 'Next.js', desc: 'Framework React fullstack', icon: '▲' },
  { name: 'TypeScript', desc: 'Tipado estático y seguro', icon: 'TS' },
  { name: 'React 19', desc: 'Componentes e interactividad', icon: '⚛' },
  { name: 'Tailwind CSS', desc: 'Estilos utility-first', icon: '🎨' },
  { name: 'Vercel', desc: 'Deploy serverless global', icon: '▲' },
  { name: 'GitHub', desc: 'Control de versiones + CI/CD', icon: '🐙' },
];

const STEPS = [
  {
    number: '01',
    title: 'Docente crea actividad',
    description: 'El profesor publica actividades con descripción, material adjunto y prompt de IA para guiar al estudiante.',
    icon: '📝',
  },
  {
    number: '02',
    title: 'Estudiante ejecuta con IA',
    description: 'El estudiante usa el prompt asignado con su asistente de IA para desarrollar el proyecto paso a paso.',
    icon: '🤖',
  },
  {
    number: '03',
    title: 'Entrega del proyecto',
    description: 'Se sube la entrega con enlace a GitHub y deploy en Vercel. Todo queda registrado y versionado.',
    icon: '🚀',
  },
  {
    number: '04',
    title: 'Calificación y feedback',
    description: 'El docente revisa, califica con retroalimentación detallada y publica la nota al estudiante.',
    icon: '✅',
  },
];

const categoryConfig: Record<string, { gradient: string; badge: string; badgeBg: string }> = {
  programming: { gradient: 'from-cyan-500/[0.1] to-blue-500/[0.03]', badge: 'Programación', badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  design: { gradient: 'from-purple-500/[0.1] to-pink-500/[0.03]', badge: 'Diseño', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  management: { gradient: 'from-amber-500/[0.1] to-orange-500/[0.03]', badge: 'Gerencia', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  leadership: { gradient: 'from-emerald-500/[0.1] to-teal-500/[0.03]', badge: 'Liderazgo', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  other: { gradient: 'from-white/[0.04] to-white/[0.01]', badge: 'Otro', badgeBg: 'bg-white/10 text-white/60 border-white/20' },
};

/**
 * LandingClient — Full landing page with scroll animations
 * Fase 22 — Inspired by Vercel, Linear, and Stripe landing pages
 */
export default function LandingClient({ heroTitle, heroSubtitle, heroDescription }: LandingClientProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const titleAnimationDuration = heroTitle.length * 0.08 + 0.6;

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.ok ? r.json() : { courses: [] })
      .then((data) => setCourses(data.courses ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ═══════════════════════════════════════════════ */}
      {/* NAVBAR                                         */}
      {/* ═══════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-xl">🎓</span>
            <span className="text-sm font-semibold text-white tracking-tight hidden sm:block">
              Plataforma Académica
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/showcase"
              className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors px-3 py-2"
            >
              Vitrina
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-black bg-white hover:bg-white/90 px-4 py-2 rounded-lg transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════ */}
      {/* HERO                                           */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-white/50">Semestre 202601 · En curso</span>
          </motion.div>

          {/* Animated title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
            <AnimatedText text={heroTitle} delay={0.2} />
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.3, duration: 0.8 }}
            className="mt-6 text-base sm:text-lg text-white/50 tracking-[0.2em] uppercase font-light"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {heroSubtitle}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.6, duration: 0.8 }}
            className="mt-4 text-sm sm:text-base text-white/30 max-w-xl mx-auto font-light"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {heroDescription}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.9, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold
                         hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/10"
            >
              Iniciar Sesión
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.1] text-white/70 text-sm font-medium
                         hover:bg-white/[0.04] hover:text-white hover:border-white/20 transition-all duration-200"
            >
              Ver Proyectos
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: titleAnimationDuration + 1.2, duration: 0.8, ease: 'easeOut' }}
            className="mt-16 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent mx-auto w-80"
            style={{ transformOrigin: 'center' }}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* COURSES                                        */}
      {/* ═══════════════════════════════════════════════ */}
      <Section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-medium text-cyan-400/60 uppercase tracking-[0.25em] mb-3">Semestre 202601</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Cursos del Semestre
            </h2>
            <p className="mt-3 text-sm text-white/35 max-w-lg mx-auto">
              Tres disciplinas, un mismo stack tecnológico. Cada curso explora una faceta diferente del desarrollo de software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(courses.length > 0 ? courses : FALLBACK_COURSES).map((course, i) => {
              const cfg = categoryConfig[course.category] ?? categoryConfig.other;
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className={`
                    rounded-2xl border border-white/[0.08] bg-gradient-to-br ${cfg.gradient}
                    p-6 hover:border-white/15 transition-colors
                  `}
                >
                  <div className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-medium mb-4 ${cfg.badgeBg}`}>
                    {cfg.badge}
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-2 line-clamp-2">{course.name}</h3>
                  <p className="text-xs text-white/35 line-clamp-3 mb-4">
                    {course.description || 'Curso del programa académico del semestre 202601.'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-white/20">
                    <span className="font-mono">{course.code}</span>
                    {course.schedule?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{course.schedule.length} sesión{course.schedule.length > 1 ? 'es' : ''}/semana</span>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <Section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-medium text-cyan-400/60 uppercase tracking-[0.25em] mb-3">Flujo de Trabajo</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              ¿Cómo funciona?
            </h2>
            <p className="mt-3 text-sm text-white/35 max-w-lg mx-auto">
              Un ciclo completo desde la creación de la actividad hasta la retroalimentación final.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
              >
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/[0.08] to-transparent z-0" />
                )}

                <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
                  {/* Number + Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{step.icon}</span>
                    <span className="text-[10px] font-mono text-white/15 tracking-wider">{step.number}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white/80 mb-2">{step.title}</h3>
                  <p className="text-xs text-white/30 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════ */}
      {/* TECH STACK                                     */}
      {/* ═══════════════════════════════════════════════ */}
      <Section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-medium text-cyan-400/60 uppercase tracking-[0.25em] mb-3">Tecnologías</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Stack Tecnológico
            </h2>
            <p className="mt-3 text-sm text-white/35 max-w-lg mx-auto">
              Construido con las herramientas más modernas del ecosistema JavaScript/TypeScript.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {STACK_ITEMS.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -4, transition: { duration: 0.15 } }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5
                           hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-default"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] text-xl font-bold text-white/60">
                  {item.icon}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/70">{item.name}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Architecture summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-cyan-400">100%</p>
                <p className="text-[11px] text-white/30 mt-1">TypeScript — Zero any</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white/80">JSON</p>
                <p className="text-[11px] text-white/30 mt-1">Base de datos en archivos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">IA</p>
                <p className="text-[11px] text-white/30 mt-1">Prompts como metodología</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════ */}
      {/* FOOTER                                         */}
      {/* ═══════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left */}
            <div className="flex items-center gap-3">
              <span className="text-lg">🎓</span>
              <div>
                <p className="text-sm font-semibold text-white/70">Plataforma Académica</p>
                <p className="text-[11px] text-white/25">Semestre 202601 · Universidad</p>
              </div>
            </div>

            {/* Center links */}
            <div className="flex items-center gap-6 text-xs text-white/30">
              <Link href="/login" className="hover:text-white/60 transition-colors">Login</Link>
              <Link href="/showcase" className="hover:text-white/60 transition-colors">Vitrina</Link>
            </div>

            {/* Right */}
            <div className="text-right">
              <p className="text-[11px] text-white/20">
                Construido con Next.js + TypeScript + IA
              </p>
              <p className="text-[10px] text-white/10 mt-0.5">
                © 2026 · Plataforma de Gestión Académica
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Fallback courses if API is unavailable ─── */
const FALLBACK_COURSES: Course[] = [
  {
    id: 'course-log-202601',
    code: 'LOG-202601',
    name: 'Lógica y Programación',
    description: 'Fundamentos de programación fullstack con TypeScript, Next.js y despliegue en Vercel. Uso de IA como herramienta de desarrollo.',
    semesterId: '202601',
    category: 'programming',
    schedule: [{ dayOfWeek: 'lunes', startTime: '08:00', endTime: '10:00', modality: 'presencial' }],
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'course-dis-202601',
    code: 'DIS-202601',
    name: 'Diseño de Interfaces RA',
    description: 'Diseño de interfaces de usuario y experiencia de usuario. Prototipado, wireframing y desarrollo de UI con React.',
    semesterId: '202601',
    category: 'design',
    schedule: [{ dayOfWeek: 'martes', startTime: '10:00', endTime: '12:00', modality: 'presencial' }],
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'course-ger-202601',
    code: 'GER-202601',
    name: 'Gerencia de Proyectos',
    description: 'Gestión de proyectos de software, metodologías ágiles, liderazgo de equipos y entrega de valor al cliente.',
    semesterId: '202601',
    category: 'management',
    schedule: [{ dayOfWeek: 'miércoles', startTime: '14:00', endTime: '16:00', modality: 'presencial' }],
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];
