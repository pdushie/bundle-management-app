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
  
  // Only admin and superadmin roles can access this page
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "superadmin")) {
    redirect("/");
  }

  return (
    <AppWithProviders>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Announcements Management</h1>
        <AnnouncementFeatureGuide />
        <AnnouncementManager />
      </div>
    </AppWithProviders>
  );
}
