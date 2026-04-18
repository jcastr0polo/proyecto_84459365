'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedText from '@/components/AnimatedText';
import { ThemeToggle } from '@/components/ThemeProvider';
import ChatWidget from '@/components/ChatWidget';
import type { Course } from '@/lib/types';
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
  Cpu,
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
  { name: 'Vercel', desc: 'Deploy global', icon: Rocket },
  { name: 'GitHub', desc: 'Version control', icon: GitBranch },
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

export default function LandingClient({ heroTitle, heroSubtitle, heroDescription }: {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
}) {
  const courses = FALLBACK_COURSES;
  const titleAnimationDuration = heroTitle.length * 0.08 + 0.6;

  return (
    <div className="min-h-screen bg-base text-foreground overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-foreground/[0.06] bg-base/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight hidden sm:block">
              NEXUS
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/showcase" className="flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-muted transition-colors px-3 py-2 rounded-lg hover:bg-foreground/[0.04]">
              <ExternalLink className="w-3.5 h-3.5" />
              Vitrina
            </Link>
            <Link href="/login" className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200">
              <LogIn className="w-3.5 h-3.5" />
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-24 sm:pt-44 sm:pb-36 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[150px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-foreground/[0.08] bg-foreground/[0.03] mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-muted tracking-wide">Semestre 2026-1 · En curso</span>
          </motion.div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter" style={{ fontFamily: 'var(--font-playfair)' }}>
            <AnimatedText text={heroTitle} delay={0.2} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.3, duration: 0.8 }}
            className="mt-8 text-base sm:text-lg text-subtle tracking-[0.15em] uppercase font-light"
          >
            {heroSubtitle}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.6, duration: 0.8 }}
            className="mt-4 text-sm sm:text-base text-subtle max-w-xl mx-auto font-light leading-relaxed"
          >
            {heroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: titleAnimationDuration + 0.9, duration: 0.6 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/login" className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-sm font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
              Comenzar ahora
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
            className="mt-20 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent mx-auto w-96"
            style={{ transformOrigin: 'center' }}
          />
        </div>
      </section>

      {/* ═══ COURSES ═══ */}
      <Section className="py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/[0.08] border border-cyan-500/10 mb-4">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400/70" />
              <span className="text-[11px] font-medium text-cyan-400/70 tracking-wider uppercase">Semestre 2026-1</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Cursos del Semestre
            </h2>
            <p className="mt-4 text-sm text-subtle max-w-lg mx-auto leading-relaxed">
              Tres disciplinas, un mismo stack. Cada curso explora una faceta del desarrollo moderno de software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                  className={`relative rounded-2xl border border-foreground/[0.08] bg-gradient-to-br ${cfg.gradient} p-6 ${cfg.border} transition-all duration-300 group`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${cfg.badgeClass}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.badge}
                    </div>
                    <span className="text-[10px] font-mono text-faint">{course.code}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground/90 mb-2 group-hover:text-foreground transition-colors">{course.name}</h3>
                  <p className="text-xs text-subtle leading-relaxed line-clamp-3">
                    {course.description || 'Curso del programa académico.'}
                  </p>
                  <div className="mt-5 pt-4 border-t border-foreground/[0.06] flex items-center gap-3 text-[11px] text-faint">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Activo</span>
                    {course.schedule?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.schedule.length} sesión/sem
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══ HOW IT WORKS ═══ */}
      <Section className="py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/[0.08] border border-purple-500/10 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-purple-400/70" />
              <span className="text-[11px] font-medium text-purple-400/70 tracking-wider uppercase">Flujo de trabajo</span>
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
                  className="relative group"
                >
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/[0.08] to-transparent z-0" />
                  )}
                  <div className="relative rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 hover:bg-foreground/[0.04] hover:border-foreground/[0.12] transition-all duration-300">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl bg-foreground/[0.05] flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                        <Icon className="w-5 h-5 text-muted group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono text-faint tracking-wider">{step.number}</span>
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
      <Section className="py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/10 mb-4">
              <Code2 className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-[11px] font-medium text-emerald-400/70 tracking-wider uppercase">Tecnologías</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>
              Stack Tecnológico
            </h2>
            <p className="mt-4 text-sm text-subtle max-w-lg mx-auto leading-relaxed">
              Las herramientas más modernas del ecosistema JavaScript/TypeScript.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
                    <p className="text-xs font-semibold text-muted">{item.name}</p>
                    <p className="text-[10px] text-faint mt-0.5">{item.desc}</p>
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
            className="mt-10 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">100%</p>
                <p className="text-[11px] text-subtle mt-1">TypeScript — Zero any</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground/80">JSON</p>
                <p className="text-[11px] text-subtle mt-1">Base de datos en archivos</p>
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">IA</p>
                <p className="text-[11px] text-subtle mt-1">Prompts como metodología</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-foreground/[0.06] py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted">NEXUS</p>
                <p className="text-[11px] text-faint">Plataforma Académica · 2026-1</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-subtle">
              <Link href="/login" className="hover:text-muted transition-colors flex items-center gap-1.5">
                <LogIn className="w-3 h-3" /> Login
              </Link>
              <Link href="/showcase" className="hover:text-muted transition-colors flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" /> Vitrina
              </Link>
            </div>
            <p className="text-[10px] text-faint">
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

/* ─── Fallback courses ─── */
const FALLBACK_COURSES: Course[] = [
  {
    id: 'course-log-202601', code: 'LOG-202601', name: 'Lógica y Programación',
    description: 'Fundamentos de programación fullstack con TypeScript, Next.js y despliegue en Vercel. Uso de IA como herramienta de desarrollo.',
    semesterId: '202601', category: 'programming',
    schedule: [{ dayOfWeek: 'lunes', startTime: '08:00', endTime: '10:00', modality: 'presencial' }],
    isActive: true, createdAt: '', updatedAt: '',
  },
  {
    id: 'course-dis-202601', code: 'DIS-202601', name: 'Diseño de Interfaces RA',
    description: 'Diseño de interfaces de usuario y experiencia de usuario. Prototipado, wireframing y desarrollo de UI con React.',
    semesterId: '202601', category: 'design',
    schedule: [{ dayOfWeek: 'martes', startTime: '10:00', endTime: '12:00', modality: 'presencial' }],
    isActive: true, createdAt: '', updatedAt: '',
  },
  {
    id: 'course-ger-202601', code: 'GER-202601', name: 'Gerencia de Proyectos',
    description: 'Gestión de proyectos de software, metodologías ágiles, liderazgo de equipos y entrega de valor al cliente.',
    semesterId: '202601', category: 'management',
    schedule: [{ dayOfWeek: 'miércoles', startTime: '14:00', endTime: '16:00', modality: 'presencial' }],
    isActive: true, createdAt: '', updatedAt: '',
  },
];
