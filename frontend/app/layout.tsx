import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import RootClient from './root-client';

const inter = Inter({ subsets: ["latin"] });

// Metadata is now synchronized with your manifest.json
export const metadata: Metadata = {
  // Title now matches the 'name' property from your manifest
  title: {
    default: "Vyapari AI", // Changed from "Vyapari"
    template: "%s | Vyapari AI", // Updated template for consistency
  },
  
  // Description now matches the 'description' from your manifest
  description: "Business tool at your hand",
  
  // This correctly points to your manifest file
  manifest: "/manifest.json",
  
  // Icons for the HTML <head> can remain as they are
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },

  // Apple-specific settings. The title here correctly uses your 'short_name'
  appleWebApp: {
    title: "Vyapari",
    capable: true, 
    statusBarStyle: "black-translucent",
  },
};

// Viewport now matches the 'theme_color' from your manifest.json
export const viewport: Viewport = {
  themeColor: "#3b82f6", // Changed from "#2563eb"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* The <head> is automatically managed by Next.js using the metadata above */}
      <body className={inter.className}>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}