/**
 * Time Service Status Component
 * Shows the current status of the external time service
 */

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  getTimeSyncStatus, 
  forceTimeSync, 
  getCurrentTimeSync, 
  getCurrentDateStringSync, 
  getCurrentTimeStringSync 
} from '../../lib/timeService';

export default function TimeServiceStatus() {
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncTime: number;
    timeOffset: number;
    isStale: boolean;
  }>({ lastSyncTime: 0, timeOffset: 0, isStale: true });
  
  const [currentTime, setCurrentTime] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(getTimeSyncStatus());
      setCurrentTime(`${getCurrentDateStringSync()} ${getCurrentTimeStringSync()}`);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await forceTimeSync();
      setSyncStatus(getTimeSyncStatus());
      console.log('✅ Time sync completed');
    } catch (error) {
      console.error('❌ Time sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (syncStatus.lastSyncTime === 0) return 'text-gray-700';
    if (syncStatus.isStale) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (syncStatus.lastSyncTime === 0) return <AlertCircle className="w-4 h-4" />;
    if (syncStatus.isStale) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (syncStatus.lastSyncTime === 0) return 'Not synchronized';
    if (syncStatus.isStale) return 'Sync is stale (>5 min)';
    return 'Synchronized';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-900">External Time Service</h3>
        </div>
        <button
          onClick={handleForceSync}
          disabled={syncing}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-700">Status:</span>
          <div className={`flex items-center gap-1 text-xs ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-700">Current Time:</span>
          <span className="text-xs font-mono text-gray-900">{currentTime}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-700">Offset:</span>
          <span className="text-xs font-mono text-gray-900">
            {syncStatus.timeOffset > 0 ? '+' : ''}{syncStatus.timeOffset}ms
          </span>
        </div>
        
        {syncStatus.lastSyncTime > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-700">Last Sync:</span>
            <span className="text-xs text-gray-700">
              {Math.round((Date.now() - syncStatus.lastSyncTime) / 1000)}s ago
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
