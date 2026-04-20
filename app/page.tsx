import React from 'react';
import type { Metadata } from 'next';
import LandingClient from '@/components/LandingClient';

export const metadata: Metadata = {
  title: 'NEXUS — Plataforma Académica | Fullstack TypeScript',
  description: 'Plataforma de gestión académica universitaria potenciada por IA. Next.js, TypeScript, React 19 y Tailwind CSS.',
};

export default function HomePage(): React.ReactElement {
  return <LandingClient />;
}
