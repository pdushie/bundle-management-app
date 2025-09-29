import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProviderClient } from '../components/SessionProviderClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust import path as needed


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Viewport export - for viewport and theme color settings
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

// Metadata export - for general metadata
export const metadata: Metadata = {
  title: 'Data Processing Suite',
  description: 'Data validation and categorization tool',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Data Processing Suite'
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`h-full ${geistSans.variable} ${geistMono.variable}`}>
        <SessionProviderClient session={session}>
          <div suppressHydrationWarning>
            {/* The AppWithProviders will provide the OrderProvider to its children */}
            {/* suppressHydrationWarning is used to avoid hydration mismatch warnings */}
            <div id="app-root">
              {children}
            </div>
          </div>
        </SessionProviderClient>
      </body>
    </html>
  );
}
