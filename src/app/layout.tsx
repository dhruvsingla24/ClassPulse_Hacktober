import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });
const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body" });
const readable = Atkinson_Hyperlegible({ subsets: ["latin"], variable: "--font-readable", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "ClassPulse Academy", template: "%s · ClassPulse" },
  description: "Don't just attend school online. Enter it, explore it, and learn inside it.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#4a66c4", width: "device-width", initialScale: 1 };

// Applies saved comfort settings before first paint, so there is no theme flash.
const boot = `try{var p=JSON.parse(localStorage.getItem('cp_prefs')||'{}');var t=p.theme||'auto';if(t==='auto')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var h=document.documentElement;h.dataset.theme=t;h.style.setProperty('--font-scale',(p.fontScale||100)/100);h.style.setProperty('--line-height',p.lineHeight||1.6);h.dataset.dyslexic=!!p.dyslexic;var m=p.motion||(matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full');h.dataset.motion=m;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${display.variable} ${bodyFont.variable} ${readable.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
