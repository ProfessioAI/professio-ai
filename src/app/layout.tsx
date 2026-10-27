import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible,
  IBM_Plex_Mono,
  Inter,
  Manrope,
} from "next/font/google";
import ScrollShine from "@/components/ScrollShine";
import { SettingsProvider } from "@/components/settings/settings-store";
import { SETTINGS_BOOTSTRAP } from "@/lib/settings-bootstrap";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Fonts that are only used when chosen in Settings (or by the Glass style) aren't
// preloaded; the browser fetches them when something actually uses them.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  preload: false,
});

const readable = Atkinson_Hyperlegible({
  variable: "--font-readable",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ProfessioAI",
  description: "AI drafting assistant for tax and accounting professionals.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171a21" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script below sets data-... attributes on <html>
    // (saved theme, text size, and so on) before React starts.
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${readable.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">
        <SettingsProvider>
          <ScrollShine />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
