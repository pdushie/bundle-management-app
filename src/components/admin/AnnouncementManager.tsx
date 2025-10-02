"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Info, AlertOctagon, Plus, Edit, Trash, ToggleLeft, ToggleRight } from "lucide-react";
import { getCurrentDateStringSync } from "../../lib/timeService";

type Announcement = {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'error';
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AnnouncementManager() {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    message: "",
    type: "info" as "info" | "warning" | "error",
    isActive: false,
    startDate: "",
    endDate: "",
  });

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/announcements");
        if (!response.ok) throw new Error("Failed to fetch announcements");
        
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Format date for display - avoid timezone conversion issues
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    // Parse the date string manually to avoid timezone conversion
    const dateParts = dateString.split('T')[0].split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      return `${month}/${day}/${year}`;
    }
    return dateString;
  };

  // Convert date string to YYYY-MM-DD format without timezone conversion
  const toDateInputValue = (dateString: string | null) => {
    if (!dateString) return "";
    // If it's already in YYYY-MM-DD format, return as-is
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    return dateString;
  };

  // Open modal for creating a new announcement
  const handleNewAnnouncement = () => {
    setEditingAnnouncement(null);
    setFormData({
      message: "",
      type: "info",
      isActive: false,
      startDate: getCurrentDateStringSync(), // Use time service to avoid timezone issues
      endDate: "",
    });
    setShowModal(true);
  };

  // Open modal for editing an announcement
  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      message: announcement.message,
      type: announcement.type,
      isActive: announcement.isActive,
      startDate: toDateInputValue(announcement.startDate),
      endDate: toDateInputValue(announcement.endDate),
    });
    setShowModal(true);
  };

  // Toggle announcement active status
  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to toggle announcement status");
      
      // Update the announcement in the local state
      setAnnouncements(prev => 
        prev.map(a => a.id === announcement.id ? { ...a, isActive: !a.isActive } : a)
      );
    } catch (error) {
      console.error("Error toggling announcement:", error);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete announcement");
      
      // Remove the announcement from the local state
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  // Submit the form to create or update an announcement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingAnnouncement 
        ? `/api/admin/announcements/${editingAnnouncement.id}` 
        : "/api/admin/announcements";
      
      const method = editingAnnouncement ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Failed to ${editingAnnouncement ? "update" : "create"} announcement`);
      
      const data = await response.json();
      
      // Update the announcements list
      if (editingAnnouncement) {
        setAnnouncements(prev => 
          prev.map(a => a.id === editingAnnouncement.id ? { ...data.announcement } : a)
        );
      } else {
        setAnnouncements(prev => [...prev, data.announcement]);
      }
      
      // Close the modal
      setShowModal(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Failed to save announcement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get appropriate icon for announcement type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertOctagon className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header with Add Button */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium">System Announcements</h2>
        <button 
          onClick={handleNewAnnouncement}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="p-8 text-center">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements</h3>
          <p className="text-gray-600">Create your first announcement to display messages to users.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(announcement.type)}
                    <span 
                      className={`text-sm font-medium px-2 py-1 rounded-full ${
                        announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                        announcement.type === 'error' ? 'bg-red-100 text-red-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                    </span>
                    <span className={`ml-2 ${announcement.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {announcement.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-800">{announcement.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span>From: {formatDate(announcement.startDate)}</span>
                    <span>To: {formatDate(announcement.endDate)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(announcement)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title={announcement.isActive ? "Deactivate" : "Activate"}
                  >
                    {announcement.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditAnnouncement(announcement)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title="Delete"
                  >
                    <Trash className="h-5 w-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Announcement Message*
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your announcement message"
                    />
                  </div>
                  
                  {/* Type */}
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Announcement Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error/Alert</option>
                    </select>
                  </div>
                  
                  {/* Dates Row */}
                  <div className="flex gap-4">
                    {/* Start Date */}
                    <div className="flex-1">
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* End Date */}
                    <div className="flex-1">
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Active Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Activate Immediately
                    </label>
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {editingAnnouncement ? "Update" : "Create"} Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
