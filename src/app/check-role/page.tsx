"use client";

import CheckUserRole from "../check-user-role";
import Link from "next/link";
import TabVisibilityDebugger from "@/components/TabVisibilityDebugger";
import RoleDebugger from "@/components/RoleDebugger";

export default function CheckUserRolePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Role Debugger</h1>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Back to Dashboard
          </Link>
        </div>
        
        <CheckUserRole />
        
        <RoleDebugger />
        
        <TabVisibilityDebugger />

        <div className="bg-white rounded-xl p-4 shadow-md">
          <h2 className="text-lg font-bold mb-2">Next Steps</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>If your role is <strong>superadmin</strong>, <strong>admin</strong>, or <strong>manager</strong>, you should see the History tab</li>
            <li>If it's not showing, try refreshing your browser or clearing cache/cookies</li>
            <li>Check if there are any JavaScript errors in the browser console</li>
            <li>Verify the server logs to see if there are any authentication issues</li>
          </ul>
          
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2">Force History Tab</h3>
            <p className="text-sm text-gray-600 mb-3">If the History tab still doesn't show up, you can try forcing it to appear with this link:</p>
            <Link 
              href="/?showHistory=true"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Force Open History Tab
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
