import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* Uno por tema: con un solo color oscuro, la barra del navegador en móvil se
     quedaba negra sobre una página clara. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

/* Sin metadataBase, una imagen de previsualización declarada con ruta relativa
   revienta la compilación; y aunque no lo hiciera, quien pegue el enlace no
   vería nada porque la URL llegaría a medias. */
const SITIO = process.env.NEXT_PUBLIC_SITE_URL ?? "https://proyecto-84459365.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: {
    default: "NEXUS — Plataforma Académica",
    template: "%s | NEXUS",
  },
  description:
    "Actividades, entregas, parciales y notas de tus cursos, en un solo sitio. Construida con Next.js, TypeScript y Supabase.",
  applicationName: "NEXUS",
  /* Añadido a la pantalla de inicio de iOS se abre como aplicación, sin la
     barra de Safari comiéndose el alto. */
  appleWebApp: { capable: true, title: "NEXUS", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "NEXUS",
    locale: "es_CO",
    title: "NEXUS — Plataforma Académica",
    description: "Actividades, entregas, parciales y notas de tus cursos, en un solo sitio.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS — Plataforma Académica",
    description: "Actividades, entregas, parciales y notas de tus cursos, en un solo sitio.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" className={`${playfairDisplay.variable} ${poppins.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-canvas text-foreground">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
