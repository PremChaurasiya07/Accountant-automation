import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import RootClient from './root-client';
// import { ProtectedRoute } from "@/components/ui/protected-route"; // This seems unused here, but kept it commented.

const inter = Inter({ subsets: ["latin"] });

// Let's define the metadata in one place
export const metadata: Metadata = {
  // It's good practice to set a default title template
  title: {
    default: "Vyapari",
    template: "%s | Vyapari",
  },
  description: "The AI-powered business tool for merchants.",
  // The manifest file tells the browser about your PWA
  manifest: "/manifest.json", // We'll use the standard name
  
  // Icons for all platforms
  icons: {
    icon: "/favicon.ico", // Fallback
    shortcut: "/favicon.svg", // Modern browsers
    apple: "/apple-touch-icon.png", // Apple devices
    // You can also add other sizes here if needed
  },

  // Specific metadata for Apple devices
  appleWebApp: {
    title: "Vyapari",
    capable: true, // This allows the app to run in full-screen mode
    statusBarStyle: "black-translucent", // Style of the status bar
  },
};

// NEW: Add a Viewport export to control theme-color and other properties
export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* The <head> is now automatically managed by Next.js using the metadata above */}
      <body className={inter.className}>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}