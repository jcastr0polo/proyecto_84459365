import React from 'react';
import type { Metadata } from 'next';
import { readHomeData } from '@/lib/dataService';
import HolaMundo from '@/components/HolaMundo';

export const metadata: Metadata = {
  title: 'Home | Mi App - TypeScript Fullstack',
  description: 'Sistema fullstack TypeScript + Next.js + Vercel funcionando correctamente.',
  authors: [{ name: 'Fullstack Engineer' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function HomePage(): React.ReactElement {
  // Lectura desde /data/home.json — solo en servidor
  const homeData = readHomeData();

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <HolaMundo
        title={homeData.hero.title}
        subtitle={homeData.hero.subtitle}
        description={homeData.hero.description}
      />
    </main>
  );
}
