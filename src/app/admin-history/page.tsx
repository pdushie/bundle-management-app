import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SuperAdminHistoryPage() {
  // Check if user is authenticated and is a superadmin
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return redirect('/auth/signin');
  }
  
  // Check if user is a superadmin
  const userRole = session?.user?.role?.toLowerCase();
  const isSuperAdmin = userRole === 'superadmin';
  
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 mb-4">
            This page is only accessible to users with the superadmin role.
          </p>
          <p className="text-gray-700">
            Your current role is: <span className="font-bold">{session.user.role}</span>
          </p>
          
          <div className="mt-6">
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Redirect to the main page with a special parameter to show the history tab for superadmin
  return redirect('/?forceTab=history&debug=true');
}
