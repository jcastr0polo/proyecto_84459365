'use client';

import React from 'react';
import ThumbNav from '@/components/ui/ThumbNav';
import { LayoutDashboard, BookOpen, Users, Menu, Home, User } from 'lucide-react';

/** Taller — barra de pulgar, y la escala de texto nueva al lado para comparar. */
export default function PrototypeThumbNav() {
  return (
    <div className="px-4 py-8 pb-24 max-w-lg mx-auto space-y-6">
      <span className="text-meta font-semibold uppercase tracking-wider text-amber-400">Taller</span>
      <h1 className="type-page text-foreground">Escala y contraste</h1>

      <section className="space-y-2 rounded-xl border border-surface-border bg-surface p-4">
        <p className="type-section text-subtle">Encabezado de sección · 13px</p>
        <p className="type-body text-foreground">Contenido normal, 15px. Es el tamaño en el que se lee la mayor parte de la aplicación.</p>
        <p className="text-sm text-muted">text-sm en muted · 15px — 9.90:1 de contraste</p>
        <p className="text-xs text-subtle">text-xs en subtle · 13px — 7.24:1</p>
        <p className="text-meta text-subtle">text-meta en subtle · 13px</p>
        <p className="text-micro text-faint">text-micro en faint · 12px — 4.55:1, el nivel más tenue que aún se lee</p>
        <p className="text-2xl font-bold tabular-nums text-foreground mt-2">4.5 <span className="text-sm text-subtle font-normal">/ 5.0</span></p>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-sunken p-4 space-y-1">
        <p className="type-section text-subtle">Sobre fondo hundido</p>
        <p className="text-xs text-subtle">Etiquetas y apoyos</p>
        <p className="text-micro text-faint">Lo más tenue: fechas, pesos, contadores</p>
      </section>

      <p className="text-xs text-subtle">La barra de abajo es la de pulgar. Pulsa &quot;Más&quot; para ver que es un botón.</p>

      <ThumbNav
        items={[
          { href: '/prototype/thumb-nav', label: 'Panel', icon: <LayoutDashboard className="w-5 h-5" /> },
          { href: '/prototype', label: 'Cursos', icon: <BookOpen className="w-5 h-5" />, badge: 3 },
          { href: '/prototype/states', label: 'Alumnos', icon: <Users className="w-5 h-5" /> },
          { label: 'Más', icon: <Menu className="w-5 h-5" />, onClick: () => {} },
        ]}
      />
    </div>
  );
}
