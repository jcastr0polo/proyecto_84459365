'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AnimatedText from './AnimatedText';

interface HolaMundoProps {
  title: string;
  subtitle: string;
  description: string;
}

export default function HolaMundo({
  title,
  subtitle,
  description,
}: HolaMundoProps): React.ReactElement {
  const titleAnimationDuration = title.length * 0.08 + 0.6;

  return (
    <div className="text-center select-none">
      {/* Título animado letra por letra */}
      <motion.h1 className="text-7xl md:text-9xl font-bold tracking-tight font-playfair">
        <AnimatedText text={title} delay={0} />
      </motion.h1>

      {/* Subtítulo con fade-in retardado */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: titleAnimationDuration + 0.3,
          duration: 0.8,
        }}
        className="mt-6 text-lg md:text-xl text-muted font-light tracking-widest uppercase font-poppins"
      >
        {subtitle}
      </motion.p>

      {/* Descripción con fade-in más retardado */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: titleAnimationDuration + 0.7,
          duration: 0.8,
        }}
        className="mt-4 text-base md:text-lg text-subtle font-light font-poppins"
      >
        {description}
      </motion.p>

      {/* Línea decorativa */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          delay: titleAnimationDuration + 1.1,
          duration: 0.6,
          ease: 'easeOut',
        }}
        className="mt-8 h-px bg-gradient-to-r from-transparent via-white/30 via-cyan-400/30 to-transparent mx-auto w-64"
        style={{
          transformOrigin: 'center',
        }}
      />
    </div>
  );
}
