import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DebugPage() {
  const session = await getServerSession(authOptions);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Authentication</h1>
      <h2>Session Data:</h2>
      <pre>{JSON.stringify(session, null, 2)}</pre>
      
      <h2>Expected for RBAC access:</h2>
      <ul>
        <li>session.user.role should be 'super_admin'</li>
        <li>session.user.id should exist</li>
      </ul>
      
      <h2>Current Status:</h2>
      <p>User Role: <strong>{session?.user ? (session.user as any).role : 'No session'}</strong></p>
      <p>User ID: <strong>{session?.user ? (session.user as any).id : 'No session'}</strong></p>
      <p>Has Super Admin Access: <strong>{session?.user && (session.user as any).role === 'super_admin' ? 'YES' : 'NO'}</strong></p>
    </div>
  );
}