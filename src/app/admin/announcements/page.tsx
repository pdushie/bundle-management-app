import React from "react";
import AppWithProviders from "../../AppWithProviders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import AnnouncementFeatureGuide from "@/components/admin/AnnouncementFeatureGuide";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Announcements Management | Admin",
  description: "Create and manage system announcements",
};

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  
  // Check RBAC permissions for announcements access or super_admin role
  if (!session?.user?.role) {
    redirect("/");
  }
  
  // For now, only allow super_admin role since we need proper RBAC integration
  // TODO: Integrate with RBAC permissions check for 'admin:announcements' 
  if (session.user.role !== 'super_admin') {
    redirect("/admin");
  }

  return (
    <AppWithProviders>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Announcements Management</h1>
        <AnnouncementFeatureGuide />
        <AnnouncementManager />
      </div>
    </AppWithProviders>
  );
}
