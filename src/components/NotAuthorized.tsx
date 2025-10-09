import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-100">
            <ShieldX className="h-12 w-12 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        
        <p className="text-gray-700 mb-6">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>
        
        <Link href="/" passHref>
          <Button className="w-full">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
