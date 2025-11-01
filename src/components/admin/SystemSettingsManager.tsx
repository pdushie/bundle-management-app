"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Lock, Unlock, Settings, Save, RefreshCw } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface SystemSetting {
  value: string;
  description: string;
}

interface SystemSettings {
  orders_halted: SystemSetting;
  orders_halt_message: SystemSetting;
}

export default function SystemSettingsManager() {
  const { data: session } = useSession();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [haltMessage, setHaltMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Check if user has system:settings permission
  if (!hasPermission('system:settings')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Access Denied</span>
        </div>
        <p className="text-red-700 mt-1">You need system settings permission to access this page.</p>
      </div>
    );
  }

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system-settings');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.settings);
          setHaltMessage(data.settings.orders_halt_message?.value || '');
        } else {
          setError('Failed to load system settings');
        }
      } else {
        setError('Failed to load system settings');
      }
    } catch (error) {
      // Console statement removed for security
      setError('Error loading system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setSettings(prev => prev ? {
            ...prev,
            [key]: {
              ...prev[key as keyof SystemSettings],
              value: value
            }
          } : null);
          
          setSuccess(`Setting updated successfully`);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(data.error || 'Failed to update setting');
        }
      } else {
        setError('Failed to update setting');
      }
    } catch (error) {
      // Console statement removed for security
      setError('Error updating setting');
    } finally {
      setSaving(false);
    }
  };

  const toggleOrderHalt = async () => {
    if (!settings) return;
    
    const currentValue = settings.orders_halted.value === 'true';
    const newValue = !currentValue;
    
    await updateSetting('orders_halted', newValue.toString());
  };

  const updateHaltMessage = async () => {
    await updateSetting('orders_halt_message', haltMessage);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading system settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Error</span>
        </div>
        <p className="text-red-700 mt-1">{error || 'Failed to load system settings'}</p>
        <button
          onClick={fetchSettings}
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const ordersHalted = settings.orders_halted.value === 'true';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">System Settings</h2>
            <p className="text-sm text-gray-600">Manage global system configuration</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Order Halt Control */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {ordersHalted ? (
                <Lock className="w-6 h-6 text-red-600" />
              ) : (
                <Unlock className="w-6 h-6 text-green-600" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">Order Processing</h3>
                <p className="text-sm text-gray-600">
                  {ordersHalted ? 'Orders are currently halted' : 'Orders are active'}
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleOrderHalt}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                ordersHalted
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50`}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : ordersHalted ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {ordersHalted ? 'Enable Orders' : 'Halt Orders'}
            </button>
          </div>

          {/* Current Status */}
          <div className={`p-3 rounded-lg border ${
            ordersHalted 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <p className={`text-sm font-medium ${
              ordersHalted ? 'text-red-800' : 'text-green-800'
            }`}>
              Status: {ordersHalted ? 'ORDERS HALTED' : 'ORDERS ACTIVE'}
            </p>
          </div>
        </div>

        {/* Halt Message Configuration */}
        <div className="border border-gray-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Halt Message</h3>
          <p className="text-sm text-gray-600 mb-3">
            Message displayed to users when orders are halted
          </p>
          
          <div className="space-y-3">
            <textarea
              value={haltMessage}
              onChange={(e) => setHaltMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Enter message to display when orders are halted..."
            />
            
            <button
              onClick={updateHaltMessage}
              disabled={saving || haltMessage === settings.orders_halt_message.value}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Update Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

