'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
  delay?: number;
}

export default function AnimatedText({
  text,
  delay = 0,
}: AnimatedTextProps): React.ReactElement {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);

  // SSR / pre-hydration: render visible plain text (no opacity:0)
  if (!hydrated) {
    return (
      <span
        className="inline-block"
        style={{ textShadow: '0 0 40px rgba(255, 255, 255, 0.3)' }}
      >
        {text}
      </span>
    );
  }

  // Client: animated per-letter version
  const letters = text.split('');

  return (
    <motion.div className="inline-block">
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + i * 0.08,
            duration: 0.6,
            ease: 'easeOut' as const,
          }}
          className="inline-block"
          style={{
            textShadow: '0 0 40px rgba(255, 255, 255, 0.3)',
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.div>
  );
}
