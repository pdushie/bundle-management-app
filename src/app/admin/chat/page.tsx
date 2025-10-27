import React from "react";
import AppWithProviders from "../../AppWithProviders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminChatPanel from "@/components/admin/AdminChatPanel";
import { Metadata } from "next";
import { neonClient } from "@/lib/db";

export const metadata: Metadata = {
  title: "Chat Support | Admin",
  description: "Manage user chat support requests",
};

async function checkChatPermission(userId: string): Promise<boolean> {
  try {
    const result = await neonClient`
      SELECT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${parseInt(userId)} AND p.name = 'admin.chat'
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking chat permission:', error);
    return false;
  }
}

export default async function AdminChatPage() {
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session?.user?.role) {
    redirect("/");
  }
  
  // Allow super_admin role or check RBAC permissions
  const userId = (session.user as any)?.id;
  const isSuperAdmin = session.user.role === 'super_admin';
  const hasChatPermission = userId ? await checkChatPermission(userId) : false;
  
  if (!isSuperAdmin && !hasChatPermission) {
    redirect("/admin");
  }

  return (
    <AppWithProviders>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Chat Support</h1>
        <AdminChatPanel />
      </div>
    </AppWithProviders>
  );
}
