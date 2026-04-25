'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { LayoutDashboard, BookOpen, Users, Sparkles, Settings, Lock, LogOut, Menu, Cpu, ChevronRight, Shield, Layers } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeProvider';
import type { Semester } from '@/lib/types';

interface UserInfo {
  firstName: string;
  lastName: string;
  role: string;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Cursos', icon: BookOpen },
  { href: '/admin/students', label: 'Estudiantes', icon: Users },
  { href: '/admin/prompts', label: 'Prompts IA', icon: Sparkles },
  { href: '/admin/audit', label: 'Auditoría', icon: Shield },
  { href: '/admin/semesters', label: 'Configuración', icon: Settings },
];

/* ─── Breadcrumb helpers ─── */
const BREADCRUMB_LABELS: Record<string, string> = {
  admin: 'Panel',
  courses: 'Cursos',
  students: 'Estudiantes',
  prompts: 'Prompts',
  semesters: 'Configuración',
  audit: 'Auditoría',
  activities: 'Actividades',
  grades: 'Calificaciones',
  projects: 'Proyectos',
  cortes: 'Cortes',
  submissions: 'Entregas',
  new: 'Nuevo',
  import: 'Importar',
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = BREADCRUMB_LABELS[seg] || (seg.length > 20 ? seg.slice(0, 8) + '...' : seg);
    crumbs.push({ label, href });
  }

  return crumbs.slice(1); // Skip "admin" root
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) { router.push('/login'); return null; }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          if (data.user.role !== 'admin') { router.push('/login'); return; }
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'));

    fetch('/api/semesters')
      .then((r) => r.ok ? r.json() : { semesters: [] })
      .then((data) => {
        const active = data.semesters?.find((s: Semester) => s.isActive);
        if (active) setSemester(active);
      })
      .catch(() => {});
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-foreground/10 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-base overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-base/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ═══ Sidebar ═══ */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-60 flex flex-col
            bg-base border-r border-foreground/10
            transform transition-transform duration-200 ease-out
            lg:relative lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-foreground/10 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">
              NEXUS
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Navegación principal">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${isActive(item.href)
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-subtle hover:text-muted hover:bg-foreground/[0.04] border border-transparent'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-foreground/10 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs font-bold text-cyan-400">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-faint uppercase tracking-wider">Administrador</p>
              </div>
            </div>
            <div className="space-y-1">
              <Link
                href="/change-password"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                           text-subtle hover:text-muted hover:bg-foreground/[0.04]
                           transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Cambiar contraseña
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                           text-subtle hover:text-red-400 hover:bg-red-500/10
                           transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </aside>

        {/* ═══ Main content area ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-foreground/10 bg-base/80 backdrop-blur-lg">
            {/* Left: hamburger + breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-subtle hover:text-foreground hover:bg-foreground/[0.04] transition-colors cursor-pointer"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumbs (desktop) */}
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs overflow-x-auto" aria-label="Migas de pan">
                  <Link href="/admin" className="text-faint hover:text-subtle transition-colors">
                    Panel
                  </Link>
                  {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={crumb.href}>
                      <ChevronRight className="w-3 h-3 text-faint" />
                      {i === breadcrumbs.length - 1 ? (
                        <span className="text-muted font-medium">{crumb.label}</span>
                      ) : (
                        <Link href={crumb.href} className="text-faint hover:text-subtle transition-colors">
                          {crumb.label}
                        </Link>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}
            </div>

            {/* Right: semester + theme + user */}
            <div className="flex items-center gap-2">
              {semester && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-foreground/10 bg-foreground/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-subtle">
                    {semester.label || semester.id}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
