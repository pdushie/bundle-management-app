"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function RoleDebugger() {
  const { data: session } = useSession();
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [userDbInfo, setUserDbInfo] = useState<any>(null);
  const [userLoading, setUserLoading] = useState<boolean>(false);

  const fetchRoleInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/role');
      const data = await response.json();
      setApiResult(data);
    } catch (error) {
      // Console statement removed for security
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserDbInfo = async () => {
    setUserLoading(true);
    try {
      const response = await fetch('/api/debug/user');
      const data = await response.json();
      setUserDbInfo(data);
    } catch (error) {
      // Console statement removed for security
    } finally {
      setUserLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-md mt-4">
      <h2 className="text-lg font-bold mb-4">User Role Debugger</h2>
      
      <div className="mb-4">
        <p className="font-medium">Client-side session info:</p>
        <pre className="bg-gray-50 p-3 rounded text-xs mt-2 max-h-40 overflow-auto">
          {JSON.stringify({
            name: session?.user?.name,
            email: session?.user?.email,
            role: session?.user?.role,
            roleType: typeof session?.user?.role,
            roleLowercase: session?.user?.role?.toLowerCase?.(),
            isSuperAdmin: session?.user?.role?.toLowerCase?.() === 'superadmin',
          }, null, 2)}
        </pre>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={fetchRoleInfo}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Loading..." : "Check Server Role Info"}
        </button>
        
        <button
          onClick={fetchUserDbInfo}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          disabled={userLoading}
        >
          {userLoading ? "Loading..." : "Check Database User"}
        </button>
      </div>
      
      {apiResult && (
        <div className="mt-4">
          <p className="font-medium">Server-side role check result:</p>
          <pre className="bg-gray-50 p-3 rounded text-xs mt-2 max-h-40 overflow-auto">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        </div>
      )}
      
      {userDbInfo && (
        <div className="mt-4">
          <p className="font-medium">Database user check result:</p>
          <pre className="bg-gray-50 p-3 rounded text-xs mt-2 max-h-40 overflow-auto">
            {JSON.stringify(userDbInfo, null, 2)}
          </pre>
          
          {userDbInfo.roleComparison && (
            <div className="mt-3 p-3 rounded border border-gray-300 bg-white">
              <p className="font-semibold">Role Comparison:</p>
              <div className={userDbInfo.roleComparison.matches ? "text-green-600" : "text-red-600"}>
                <p><strong>Session Role:</strong> {userDbInfo.roleComparison.sessionRole}</p>
                <p><strong>Database Role:</strong> {userDbInfo.roleComparison.dbRole}</p>
                <p><strong>Match Status:</strong> {userDbInfo.roleComparison.matches ? "✅ Exact Match" : "âŒ No Match"}</p>
                {!userDbInfo.roleComparison.matches && userDbInfo.roleComparison.lowerCaseMatches && (
                  <p className="text-orange-600">
                    <strong>Case Issue:</strong> Roles match when comparing case-insensitively
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

