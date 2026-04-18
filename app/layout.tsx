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
  themeColor: "#0d1117",
};

export const metadata: Metadata = {
  title: {
    default: "NEXUS — Plataforma Académica",
    template: "%s | NEXUS",
  },
  description: "Plataforma de gestión académica universitaria potenciada por IA. Fullstack TypeScript + Next.js + React 19.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" className={`${playfairDisplay.variable} ${poppins.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-base text-foreground">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
