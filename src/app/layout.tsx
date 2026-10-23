import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KanalAtlas — neighbourhood accessibility & scenario map for Adana",
  description:
    "Open-source prototype that measures straight-line access to mapped swimming facilities and parks along an open irrigation canal corridor in Seyhan, Adana, compares hypothetical facility scenarios and produces a planning brief. English and Turkish.",
};

export const viewport: Viewport = { themeColor: "#0f2340" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
