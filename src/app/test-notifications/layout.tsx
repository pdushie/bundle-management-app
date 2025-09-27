import { ReactNode } from 'react';

export const metadata = {
  title: 'Test Notifications',
  description: 'Test page for notification system',
};

export default function TestNotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
