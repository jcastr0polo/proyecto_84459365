'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';

interface UserInfo {
  firstName: string;
  lastName: string;
  role: string;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/semesters', label: 'Semestres', icon: '📅' },
  { href: '/admin/courses', label: 'Cursos', icon: '📚' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/10 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-black overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-60 flex flex-col
            bg-[#0a0a0a] border-r border-white/[0.06]
            transform transition-transform duration-200 ease-out
            lg:relative lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0">
            <span className="text-xl" aria-hidden="true">🎓</span>
            <span className="text-sm font-semibold text-white tracking-tight">
              Plataforma Académica
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
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
                      }
                    `}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/[0.06] shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Administrador</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                         text-white/40 hover:text-red-400 hover:bg-red-500/10
                         transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-lg">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Abrir menú"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Breadcrumb area  */}
            <div className="hidden lg:block" />

            {/* Right side: semester indicator */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/30 hidden sm:block">
                Semestre activo cargado en cada página
              </span>
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
