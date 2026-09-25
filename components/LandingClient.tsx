'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedText from '@/components/AnimatedText';
import { ThemeToggle } from '@/components/ThemeProvider';
import ChatWidget from '@/components/ChatWidget';
import type { Course } from '@/lib/types';
import NexusMark from '@/components/ui/NexusMark';
import {
  ArrowRight,
  ExternalLink,
  Sparkles,
  Code2,
  Rocket,
  MessageSquareText,
  GraduationCap,
  BookOpen,
  Users,
  GitBranch,
  Database,
  Palette,
  BarChart3,
  Globe,
  Zap,
  ChevronRight,
  LogIn,
} from 'lucide-react';

/* ─── Section wrapper with CSS scroll reveal (SSR-safe) ─── */
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 80) { el.classList.add('visible'); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.disconnect(); } },
      { rootMargin: '-80px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <section ref={ref} className={`scroll-reveal ${className}`}>{children}</section>;
}

/* ─── Constants ─── */
const STACK_ITEMS = [
  { name: 'Next.js 16', desc: 'Framework fullstack', icon: Globe },
  { name: 'TypeScript', desc: 'Tipado estricto', icon: Code2 },
  { name: 'React 19', desc: 'UI declarativa', icon: Zap },
  { name: 'Tailwind', desc: 'Utility-first CSS', icon: Palette },
  { name: 'Supabase', desc: 'Postgres gestionado', icon: Database },
  { name: 'Vercel', desc: 'Deploy global', icon: Rocket },
  { name: 'GitHub', desc: 'Control de versiones', icon: GitBranch },
];

const STEPS = [
  { number: '01', title: 'Docente crea actividad', description: 'Publica actividades con material adjunto y prompt de IA para guiar al estudiante paso a paso.', icon: BookOpen },
  { number: '02', title: 'Estudiante ejecuta con IA', description: 'Usa el prompt asignado con su asistente de IA para desarrollar el proyecto de forma guiada.', icon: Sparkles },
  { number: '03', title: 'Entrega del proyecto', description: 'Sube la entrega con enlace a GitHub y deploy en Vercel. Todo queda registrado y versionado.', icon: Rocket },
  { number: '04', title: 'Feedback y calificación', description: 'El docente revisa, califica con retroalimentación detallada y publica la nota.', icon: MessageSquareText },
];

const categoryConfig: Record<string, { gradient: string; border: string; badge: string; badgeClass: string; icon: typeof Code2 }> = {
  programming: { gradient: 'from-cyan-500/10 to-blue-500/5', border: 'hover:border-cyan-500/30', badge: 'Programación', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Code2 },
  design: { gradient: 'from-purple-500/10 to-pink-500/5', border: 'hover:border-purple-500/30', badge: 'Diseño', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Palette },
  management: { gradient: 'from-amber-500/10 to-orange-500/5', border: 'hover:border-amber-500/30', badge: 'Gerencia', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: BarChart3 },
  other: { gradient: 'from-white/5 to-white/[0.02]', border: 'hover:border-foreground/20', badge: 'Otro', badgeClass: 'bg-foreground/10 text-muted border-foreground/20', icon: BookOpen },
};

export interface LandingProps {
  /** Portada editable desde la aplicación. null si no se pudo leer. */
  hero: { title: string; subtitle: string; description: string } | null;
  /** Etiqueta del semestre activo, tal cual está en la base ("2026 - Segundo Semestre"). */
  semesterLabel: string | null;
  /** Cursos activos de ese semestre. Vacío = no se anuncia ningún catálogo. */
  courses: Course[];
}

export default function LandingClient({ hero, semesterLabel, courses }: LandingProps) {
  const heroTitle = hero?.title || 'NEXUS';
  const heroSubtitle = hero?.subtitle ?? '';
  const heroDescription = hero?.description ?? '';
  const titleAnimationDuration = heroTitle.length * 0.08 + 0.6;

  return (
    <div className="min-h-screen bg-canvas text-foreground overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-foreground/[0.06] bg-canvas/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group min-h-11 pr-2 rounded-lg">
            <NexusMark size="sm" decorative />
            <span className="text-sm font-bold text-foreground tracking-tight hidden sm:block">
              NEXUS
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/showcase" className="flex items-center gap-1.5 text-sm font-medium text-subtle hover:text-foreground transition-colors px-3 min-h-11 rounded-lg hover:bg-foreground/[0.04]">
              <ExternalLink className="w-3.5 h-3.5" />
              Vitrina
            </Link>
            <Link href="/login" className="flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-4 min-h-11 rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200">
              <LogIn className="w-3.5 h-3.5" />
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-24 pb-6 sm:pt-28 sm:pb-8 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[150px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Sin semestre activo no se anuncia ninguno: el punto verde que
              parpadea dice "en curso", y eso tiene que ser verdad. */}
          {semesterLabel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-foreground/[0.08] bg-foreground/[0.03] mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-meta font-medium text-muted tracking-wide">{semesterLabel} · En curso</span>
          </motion.div>
          )}

          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter" style={{ fontFamily: 'var(--font-playfair)' }}>
            <AnimatedText text={heroTitle} delay={0.2} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.3, duration: 0.8 }}
            className="mt-8 text-base sm:text-lg tracking-[0.15em] uppercase font-light"
            style={{ color: 'var(--subtle-fg)' }}
          >
            {heroSubtitle}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.6, duration: 0.8 }}
            className="mt-4 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed"
            style={{ color: 'var(--muted-fg)' }}
          >
            {heroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.9, duration: 0.6 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/login" className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-sm font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
              Entrar a la plataforma
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/showcase" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-foreground/[0.1] text-muted text-sm font-medium hover:bg-foreground/[0.04] hover:text-foreground hover:border-foreground/20 transition-all duration-200">
              Ver proyectos
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: titleAnimationDuration + 1.2, duration: 0.8, ease: 'easeOut' }}
            className="mt-14 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent mx-auto w-96"
            style={{ transformOrigin: 'center' }}
          />
        </div>
      </section>

      {/* ═══ COURSES ═══ */}
      {courses.length > 0 && (
      <Section className="py-6 sm:py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/[0.08] border border-cyan-500/10 mb-4">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400/70" />
              <span className="text-meta font-medium text-cyan-400/70 tracking-wider uppercase">{semesterLabel}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Cursos del Semestre
            </h2>
            <p className="mt-4 text-sm text-subtle max-w-lg mx-auto leading-relaxed">
              {courses.length === 1
                ? 'Un curso, un stack completo, de la primera línea al despliegue.'
                : `${courses.length} asignaturas, un mismo stack. Cada una explora una faceta del desarrollo moderno de software.`}
            </p>
          </div>

          <div className={`grid grid-cols-1 gap-5 ${courses.length === 1 ? 'max-w-md mx-auto' : courses.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {courses.map((course, i) => {
              const cfg = categoryConfig[course.category] ?? categoryConfig.other;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className={`relative h-full rounded-2xl border border-foreground/[0.08] bg-gradient-to-br ${cfg.gradient} p-6 ${cfg.border} transition-all duration-300 group`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-micro font-medium ${cfg.badgeClass}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.badge}
                    </div>
                    <span className="text-micro font-mono text-faint">{course.code}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground/90 mb-2 group-hover:text-foreground transition-colors">{course.name}</h3>
                  {/* En la base, la descripción de estas asignaturas es su
                      propio nombre, así que la tarjeta lo decía dos veces.
                      Mejor una línea menos que una línea repetida. */}
                  {course.description
                    && course.description.trim().toLowerCase() !== course.name.trim().toLowerCase() && (
                    <p className="text-sm text-subtle leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-5 pt-4 border-t border-foreground/[0.06] flex items-center gap-3 text-meta text-faint">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Activo</span>
                    {course.schedule?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.schedule.length} {course.schedule.length === 1 ? 'sesión' : 'sesiones'}/sem
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>
      )}

      {/* ═══ HOW IT WORKS ═══ */}
      <Section className="py-6 sm:py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/[0.08] border border-purple-500/10 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-purple-400/70" />
              <span className="text-meta font-medium text-purple-400/70 tracking-wider uppercase">Flujo de trabajo</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              ¿Cómo funciona?
            </h2>
            <p className="mt-4 text-sm text-subtle max-w-lg mx-auto leading-relaxed">
              Un ciclo completo desde la creación de la actividad hasta el feedback final.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="relative group h-full"
                >
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/[0.08] to-transparent z-0" />
                  )}
                  <div className="relative h-full rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 hover:bg-foreground/[0.04] hover:border-foreground/[0.12] transition-all duration-300">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl bg-foreground/[0.05] flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                        <Icon className="w-5 h-5 text-muted group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <span className="text-micro font-mono text-faint tracking-wider">{step.number}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground/80 mb-2">{step.title}</h3>
                    <p className="text-xs text-subtle leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══ TECH STACK ═══ */}
      <Section className="py-6 sm:py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/10 mb-4">
              <Code2 className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-meta font-medium text-emerald-400/70 tracking-wider uppercase">Tecnologías</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Stack Tecnológico
            </h2>
            <p className="mt-4 text-sm text-subtle max-w-lg mx-auto leading-relaxed">
              Las herramientas más modernas del ecosistema JavaScript/TypeScript.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {STACK_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-5 hover:bg-foreground/[0.04] hover:border-foreground/[0.1] transition-all cursor-default group"
                >
                  <div className="w-12 h-12 rounded-xl bg-foreground/[0.04] flex items-center justify-center group-hover:bg-foreground/[0.08] transition-colors">
                    <Icon className="w-5 h-5 text-subtle group-hover:text-muted transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    {/* Esto es texto para leer, no una etiqueta: sube del suelo
                        de 12px al resto de la escala. Los otros text-micro del
                        home son códigos y ordinales, y ahí 12px se sostiene. */}
                    <p className="text-xs text-subtle mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">100%</p>
                <p className="text-meta text-subtle mt-1">TypeScript — Zero any</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground/80">Postgres</p>
                <p className="text-meta text-subtle mt-1">Datos en Supabase</p>
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">IA</p>
                <p className="text-meta text-subtle mt-1">Prompts como metodología</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-foreground/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <NexusMark size="sm" decorative />
              <div>
                <p className="text-sm font-bold text-muted">NEXUS</p>
                <p className="text-meta text-faint">Plataforma Académica{semesterLabel ? ` · ${semesterLabel}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-subtle">
              <Link href="/login" className="hover:text-foreground hover:bg-foreground/[0.04] transition-colors flex items-center gap-1.5 px-3 min-h-11 rounded-lg">
                <LogIn className="w-4 h-4" aria-hidden="true" /> Entrar
              </Link>
              <Link href="/showcase" className="hover:text-foreground hover:bg-foreground/[0.04] transition-colors flex items-center gap-1.5 px-3 min-h-11 rounded-lg">
                <ExternalLink className="w-4 h-4" aria-hidden="true" /> Vitrina
              </Link>
            </div>
            <p className="text-micro text-faint">
              Next.js + TypeScript + IA · © 2026
            </p>
          </div>
        </div>
      </footer>

      {/* ═══ CHAT WIDGET ═══ */}
      <ChatWidget />
    </div>
  );
}
