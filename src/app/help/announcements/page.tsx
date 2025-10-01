import React from "react";
import Link from "next/link";
import { ArrowLeft, Info, AlertTriangle, AlertOctagon, CheckCircle, Calendar, ToggleRight, Bell } from "lucide-react";

export default function AnnouncementsHelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link 
        href="/admin/announcements" 
        className="inline-flex items-center mb-6 text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Announcements
      </Link>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="mr-3 h-6 w-6 text-blue-600" />
            Announcements System Guide
          </h1>
          <p className="mt-2 text-gray-600">
            Learn how to create and manage announcements to communicate important information to your users
          </p>
        </div>

        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Overview</h2>
            <p className="text-gray-700">
              The Announcements system allows administrators to create important notifications that will be displayed to all users at the top of the application. These announcements can be used to communicate system updates, maintenance windows, important news, or any other critical information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Creating Announcements</h2>
            <ol className="list-decimal pl-5 space-y-3 text-gray-700">
              <li>
                <span className="font-medium">Navigate to the Announcements page:</span> 
                <p className="mt-1">
                  Access the Announcements Management page from the Admin dashboard.
                </p>
              </li>
              <li>
                <span className="font-medium">Click "Add Announcement":</span> 
                <p className="mt-1">
                  Use the button at the top of the Announcements Management page.
                </p>
              </li>
              <li>
                <span className="font-medium">Fill in announcement details:</span>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Message:</strong> Write a clear, concise announcement. Long messages will be automatically truncated in the display banner with the full text accessible via hover.</li>
                  <li><strong>Type:</strong> Select the appropriate type based on urgency:
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center">
                        <span className="inline-flex mr-2 rounded-full bg-blue-100 p-1">
                          <Info className="h-4 w-4 text-blue-600" />
                        </span>
                        <span><strong>Info</strong> - General information and updates (blue)</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex mr-2 rounded-full bg-yellow-100 p-1">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        </span>
                        <span><strong>Warning</strong> - Important notices that need attention (yellow)</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex mr-2 rounded-full bg-red-100 p-1">
                          <AlertOctagon className="h-4 w-4 text-red-600" />
                        </span>
                        <span><strong>Error</strong> - Critical issues or urgent information (red)</span>
                      </div>
                    </div>
                  </li>
                  <li><strong>Active Status:</strong> Toggle whether the announcement is active or not.</li>
                  <li><strong>Schedule (Optional):</strong> Set start and end dates to automatically activate and deactivate the announcement.</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">Save the announcement:</span> 
                <p className="mt-1">
                  Click "Create Announcement" to publish it (if active) or save it for later activation.
                </p>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Managing Existing Announcements</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Edit an announcement:</strong> Click the edit icon next to any announcement to modify its content, type, or scheduling.</p>
              <p><strong>Toggle status:</strong> Use the toggle switch to quickly activate or deactivate announcements.</p>
              <p><strong>Delete an announcement:</strong> Click the delete icon to permanently remove an announcement.</p>
              <p><strong>Multiple announcements:</strong> If multiple active announcements exist, they will rotate in the banner at the top of the application.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Best Practices</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><strong>Keep messages concise</strong> - Aim for under 150 characters for optimal visibility.</li>
              <li><strong>Use appropriate types</strong> - Reserve "Error" type for truly critical issues.</li>
              <li><strong>Set expiration dates</strong> - Always set an end date to ensure outdated announcements don't remain visible.</li>
              <li><strong>Limit active announcements</strong> - Having too many active announcements can diminish their impact.</li>
              <li><strong>Verify display</strong> - After creating an announcement, check the main application to ensure it displays correctly.</li>
            </ul>
          </section>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 flex">
            <div className="mr-3 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm text-blue-700">
              <p><strong>Pro tip:</strong> For time-sensitive announcements, consider using both the announcement system and sending a direct notification to ensure users see the information promptly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
