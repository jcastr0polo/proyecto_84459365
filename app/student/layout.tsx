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
  { href: '/student', label: 'Inicio', icon: '🏠' },
  { href: '/student/courses', label: 'Mis Cursos', icon: '📚' },
  { href: '/student/profile', label: 'Mi Perfil', icon: '👤' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) { router.push('/login'); return null; }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          if (data.user.role !== 'student') { router.push('/login'); return; }
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Close menus via callback — passed to nav items
  function closeMenus() {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/student') return pathname === '/student';
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
      <div className="min-h-screen bg-black">
        {/* ═══ Top Navbar ═══ */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Left: Logo + Nav Links */}
              <div className="flex items-center gap-8">
                {/* Logo */}
                <Link href="/student" className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xl" aria-hidden="true">🎓</span>
                  <span className="text-sm font-semibold text-white tracking-tight hidden sm:block">
                    Plataforma Académica
                  </span>
                </Link>

                {/* Desktop nav links */}
                <nav className="hidden md:flex items-center gap-1" aria-label="Navegación estudiante">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                        ${isActive(item.href)
                          ? 'text-cyan-400 bg-cyan-500/10'
                          : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                        }
                      `}
                    >
                      <span className="text-sm" aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Right: Theme + User */}
              <div className="flex items-center gap-2">
                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-white/60 hidden sm:block">
                      {user.firstName}
                    </span>
                    <svg className="hidden sm:block" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950 shadow-2xl z-50 overflow-hidden">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-medium text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-[11px] text-white/20">Estudiante</p>
                        </div>
                        {/* Links */}
                        <div className="py-1">
                          <Link
                            href="/student/profile"
                            onClick={closeMenus}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                            Mi Perfil
                          </Link>
                          <Link
                            href="/change-password"
                            onClick={closeMenus}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            Cambiar contraseña
                          </Link>
                        </div>
                        {/* Logout */}
                        <div className="py-1 border-t border-white/10">
                          <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                  aria-label="Menú"
                >
                  {mobileMenuOpen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile nav dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-zinc-950">
              <nav className="px-4 py-3 space-y-1" aria-label="Navegación móvil">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                      ${isActive(item.href)
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
