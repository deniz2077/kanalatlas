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
  title: "KanalAtlas — Adana mahalle erişilebilirlik ve senaryo aracı",
  description:
    "Adana Seyhan'daki açık sulama kanalı koridorunda haritalanmış yüzme tesislerine ve parklara düz çizgi erişimini ölçen, varsayımsal tesis senaryolarını karşılaştıran ve planlama raporu üreten açık kaynak prototip.",
};

export const viewport: Viewport = { themeColor: "#0f2340" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${plexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
