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
  
  // Only admin and superadmin roles can access this page
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "superadmin")) {
    redirect("/");
  }

  return (
    <AppWithProviders>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Chat Support</h1>
        <AdminChatPanel />
      </div>
    </AppWithProviders>
  );
}
