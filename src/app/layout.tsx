import type { Metadata } from "next";
import { Orbitron, Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "turbo-broccoli",
  description: "Pre-deployment Security Guardrails",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground overflow-x-hidden min-h-screen selection:bg-primary selection:text-black`}
      >
        {/* Atmosphere: CRT Distortion & Grid Floor */}
        <div className="fixed inset-0 pointer-events-none z-[9999] mix-blend-overlay opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")` }}></div>
        <div className="fixed inset-0 pointer-events-none z-[9999] crt-lines"></div>
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-grid-perspective opacity-40"></div>
        <div className="fixed inset-0 pointer-events-none z-[9999] radial-vignette"></div>

        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
