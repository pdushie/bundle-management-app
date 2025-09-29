"use client";

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Check,
  X,
  RefreshCw
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserPricingAssignmentProps {
  profileId: string;
  onClose: () => void;
}

export default function UserPricingAssignment({ profileId, onClose }: UserPricingAssignmentProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    fetchProfileData();
    fetchUsers();
  }, [profileId]);

  const fetchProfileData = async () => {
    try {
      const response = await fetch(`/api/admin/pricing-profiles/${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileName(data.profile.name);
        // Make sure we're handling the assigned users correctly
        if (data.assignedUsers && Array.isArray(data.assignedUsers)) {
          setAssignedUsers(data.assignedUsers);
        } else if (data.users && Array.isArray(data.users)) {
          // Alternative API response format
          setAssignedUsers(data.users);
        } else {
          setAssignedUsers([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignUser = async (userId: string) => {
    setAssignmentLoading(userId);
    try {
      const response = await fetch(`/api/admin/user-profile-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profileId })
      });
      
      if (response.ok) {
        // Find the user in allUsers and add to assignedUsers
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          setAssignedUsers(prev => [...prev, user]);
        }
      }
    } catch (error) {
      console.error('Failed to assign user:', error);
    } finally {
      setAssignmentLoading(null);
    }
  };

  const unassignUser = async (userId: string) => {
    setAssignmentLoading(userId);
    try {
      const response = await fetch(`/api/admin/user-profile-assignment?userId=${userId}&profileId=${profileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setAssignedUsers(prev => prev.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Failed to unassign user:', error);
    } finally {
      setAssignmentLoading(null);
    }
  };

  // Filter users based on search term
  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if a user is assigned to this profile
  const isUserAssigned = (userId: string) => {
    return assignedUsers.some(user => user.id === userId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          <Users className="inline-block mr-2 h-5 w-5" />
          User Assignment for "{profileName}"
        </h3>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            fetchProfileData();
            fetchUsers();
          }}
          disabled={isLoading}
          className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No users found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="text-right">
                    {isUserAssigned(user.id) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unassignUser(user.id)}
                        disabled={assignmentLoading === user.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {assignmentLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                        ) : (
                          <UserMinus className="w-4 h-4 mr-1" />
                        )}
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => assignUser(user.id)}
                        disabled={assignmentLoading === user.id}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        {assignmentLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                        ) : (
                          <UserPlus className="w-4 h-4 mr-1" />
                        )}
                        Assign
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1 mb-1">
          <Users className="w-4 h-4" />
          Users assigned to this profile: {assignedUsers.length}
        </h4>
        <p className="text-xs text-blue-700">
          {assignedUsers.length === 0 
            ? "No users are currently assigned to this profile." 
            : "These users will be charged according to this pricing profile."}
        </p>
      </div>
    </div>
  );
}
