import React from "react";
import AppWithProviders from "../../AppWithProviders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminChatPanel from "@/components/admin/AdminChatPanel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Support | Admin",
  description: "Manage user chat support requests",
};

export default async function AdminChatPage() {
  const session = await getServerSession(authOptions);
  
  // Check RBAC permissions for chat access or super_admin role
  if (!session?.user?.role) {
    redirect("/");
  }
  
  // For now, only allow super_admin role since we need proper RBAC integration
  // TODO: Integrate with RBAC permissions check for 'admin:chat'
  if (session.user.role !== 'super_admin') {
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
