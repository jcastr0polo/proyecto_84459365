import React from 'react';

/**
 * El tablero de proyección vive FUERA de /admin a propósito.
 *
 * Dentro heredaba la barra lateral, la de arriba, las migas y el menú de
 * usuario: cosas para trabajar, no para mostrar. «Pantalla completa» no las
 * quitaba porque maximizar la ventana no es lo mismo que quitar el cromo.
 * Aquí no hay nada que no sea la clase avanzando.
 */
export default function TableroLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas">{children}</div>;
}
