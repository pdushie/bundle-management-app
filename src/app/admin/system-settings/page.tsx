import React from "react";
import AppWithProviders from "../../AppWithProviders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SystemSettingsManager from "@/components/admin/SystemSettingsManager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Settings | Admin",
  description: "Manage global system settings and order controls",
};

export default async function SystemSettingsPage() {
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session?.user?.role) {
    redirect("/");
  }
  
  // Only allow super_admin role
  if (session.user.role !== 'super_admin') {
    redirect("/admin");
  }

  return (
    <AppWithProviders>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">System Settings</h1>
        <SystemSettingsManager />
      </div>
    </AppWithProviders>
  );
}