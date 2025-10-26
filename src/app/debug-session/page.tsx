import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DebugPage() {
  const session = await getServerSession(authOptions);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Session Debug</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  );
}