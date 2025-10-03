import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProviderClient } from '../components/SessionProviderClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import NewFeatureNotifier from '@/components/NewFeatureNotifier';
import AdminDashboardLink from '@/components/AdminDashboardLink';
import UserChat from '@/components/UserChat';


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
  title: 'Clickyfied',
  description: 'Data validation and categorization tool',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: ''
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
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
              <AnnouncementBanner />
              {children}
              <NewFeatureNotifier />
              {/* AdminDashboardLink will only render for admin users */}
              <div suppressHydrationWarning>
                {/* AdminDashboardLink is imported as a client component */}
                <AdminDashboardLink />
                {/* UserChat will only render for logged in users */}
                <UserChat />
              </div>
            </div>
          </div>
        </SessionProviderClient>
      </body>
    </html>
  );
}
