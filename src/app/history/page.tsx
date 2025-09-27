import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HistoryViewer from '@/components/HistoryViewer';

export default async function HistoryPage() {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);
  if (!session) {
    return redirect('/auth/signin');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <HistoryViewer />
      </div>
    </main>
  );
}
