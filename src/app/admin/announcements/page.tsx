import React from "react";
import AppWithProviders from "../../AppWithProviders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import AnnouncementFeatureGuide from "@/components/admin/AnnouncementFeatureGuide";
import { Metadata } from "next";
import { neonClient } from "@/lib/db";

export const metadata: Metadata = {
  title: "Announcements Management | Admin",
  description: "Create and manage system announcements",
};

async function checkAnnouncementsPermission(userId: string): Promise<boolean> {
  try {
    const result = await neonClient`
      SELECT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${parseInt(userId)} AND p.name = 'admin.announcements'
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking announcements permission:', error);
    return false;
  }
}

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session?.user?.role) {
    redirect("/");
  }
  
  // Allow super_admin role or check RBAC permissions
  const userId = (session.user as any)?.id;
  const isSuperAdmin = session.user.role === 'super_admin';
  const hasAnnouncementsPermission = userId ? await checkAnnouncementsPermission(userId) : false;
  
  if (!isSuperAdmin && !hasAnnouncementsPermission) {
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
