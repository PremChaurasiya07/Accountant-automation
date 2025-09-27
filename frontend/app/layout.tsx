import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // 1. Import the Script component
import "./globals.css";
import RootClient from './root-client';

const inter = Inter({ subsets: ["latin"] });

// Metadata remains the same
export const metadata: Metadata = {
  title: {
    default: "Vyapari AI",
    template: "%s | Vyapari AI",
  },
  description: "Business tool at your hand",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Vyapari",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

// Viewport remains the same
export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 2. Define your Google Analytics Measurement ID
  const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 3. Add the Google Analytics scripts before your main content */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        
        {/* Your app's client wrapper and children */}
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}