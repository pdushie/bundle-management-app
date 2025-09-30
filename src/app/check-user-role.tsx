"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function CheckUserRole() {
  const { data: session, status } = useSession();
  const [serverSession, setServerSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerSession = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/debug/session');
        if (!res.ok) {
          throw new Error('Failed to fetch server session');
        }
        const data = await res.json();
        setServerSession(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchServerSession();
  }, []);

  return (
    <div className="bg-white rounded-xl p-4 shadow-md space-y-4">
      <h2 className="text-lg font-bold mb-2">Current User Information</h2>
      
      <div>
        <h3 className="font-semibold text-blue-600">Client Session Status</h3>
        <p className="text-gray-700 mb-2">Status: {status}</p>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(session?.user, null, 2)}
        </pre>
      </div>
      
      <div>
        <h3 className="font-semibold text-blue-600">Server Session</h3>
        {loading ? (
          <p>Loading server session data...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error}</p>
        ) : (
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(serverSession, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
