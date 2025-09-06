"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface SessionProviderClientProps {
  children: ReactNode;
  session?: any;
}

export function SessionProviderClient({ children, session }: SessionProviderClientProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
