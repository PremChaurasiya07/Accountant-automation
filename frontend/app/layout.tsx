import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import RootClient from './root-client';
import { ProtectedRoute } from "@/components/ui/protected-route";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vyapari",
  description: "Business tool at your hand",
  icons: {
    icon: "/favicon.ico", // standard fallback icon
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Apple */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Vyapari" />
      </head>
      <body className={inter.className}>
       
          <RootClient>{children}</RootClient>
        
      </body>
    </html>
  );
}
