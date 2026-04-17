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
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: {
    default: "Plataforma de Gestión Académica",
    template: "%s | Plataforma Académica",
  },
  description: "Plataforma web de gestión académica universitaria. Fullstack TypeScript + Next.js + React 19.",
  authors: [{ name: "Plataforma Académica" }],
  robots: "index, follow",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://plataforma-academica.vercel.app"),
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Plataforma Académica",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
