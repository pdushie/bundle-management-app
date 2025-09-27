"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface SessionProviderClientProps {
  children: ReactNode;
  session?: any;
}

export function SessionProviderClient({ children, session }: SessionProviderClientProps) {
  return (
    <SessionProvider 
      session={session}
      // Set session to refresh when it's about to expire (30 minutes before expiry)
      refetchInterval={30 * 60} // 30 minutes in seconds
      refetchOnWindowFocus={true} // Refresh when window gains focus
    >
      {children}
    </SessionProvider>
  );
}
