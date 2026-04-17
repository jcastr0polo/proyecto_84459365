import React from 'react';
import type { Metadata } from 'next';
import { readHomeData } from '@/lib/dataService';
import LandingClient from '@/components/LandingClient';

export const metadata: Metadata = {
  title: 'Plataforma de Gestión Académica | Fullstack TypeScript',
  description: 'Plataforma web de gestión académica universitaria construida con Next.js, TypeScript, React 19 y Tailwind CSS. Caso de estudio fullstack.',
  authors: [{ name: 'Plataforma Académica' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Plataforma de Gestión Académica',
    description: 'Sistema fullstack de gestión académica universitaria. Next.js + TypeScript + React 19 + Tailwind CSS.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Plataforma Académica',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plataforma de Gestión Académica',
    description: 'Sistema fullstack de gestión académica universitaria.',
  },
  keywords: ['gestión académica', 'Next.js', 'TypeScript', 'React', 'Tailwind CSS', 'Vercel', 'fullstack', 'universidad'],
};

export default function HomePage(): React.ReactElement {
  const homeData = readHomeData();

  return (
    <LandingClient
      heroTitle={homeData.hero.title}
      heroSubtitle={homeData.hero.subtitle}
      heroDescription={homeData.hero.description}
    />
  );
}
