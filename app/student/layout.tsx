'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { Home, BookOpen, User, Lock, LogOut, Menu, X, ChevronDown, Cpu } from 'lucide-react';

interface UserInfo {
  firstName: string;
  lastName: string;
  role: string;
}

const NAV_ITEMS = [
  { href: '/student', label: 'Inicio', icon: Home },
  { href: '/student/courses', label: 'Mis Cursos', icon: BookOpen },
  { href: '/student/profile', label: 'Mi Perfil', icon: User },
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
              {/* Left: Logo + Nav */}
              <div className="flex items-center gap-8">
                <Link href="/student" className="flex items-center gap-2.5 shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <Cpu className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold text-white tracking-tight hidden sm:block">
                    NEXUS
                  </span>
                </Link>

                <nav className="hidden md:flex items-center gap-1" aria-label="Navegación estudiante">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
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
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Right: User + Mobile */}
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
                    <ChevronDown className="w-3 h-3 text-white/30 hidden sm:block" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950 shadow-2xl z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-[11px] text-white/20">Estudiante</p>
                        </div>
                        <div className="py-1">
                          <Link href="/student/profile" onClick={closeMenus}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04] transition-colors">
                            <User className="w-3.5 h-3.5" /> Mi Perfil
                          </Link>
                          <Link href="/change-password" onClick={closeMenus}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04] transition-colors">
                            <Lock className="w-3.5 h-3.5" /> Cambiar contraseña
                          </Link>
                        </div>
                        <div className="py-1 border-t border-white/10">
                          <button onClick={handleLogout} disabled={loggingOut}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50">
                            <LogOut className="w-3.5 h-3.5" />
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
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-zinc-950">
              <nav className="px-4 py-3 space-y-1" aria-label="Navegación móvil">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
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
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
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
