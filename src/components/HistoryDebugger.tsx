"use client";

import { useState, useEffect } from "react";

type ApiEndpointStatus = {
  status?: number;
  ok?: boolean;
  data?: any;
  error?: any;
  dataPromise?: Promise<any> | null;
};

type ApiStatus = {
  historyRoute: ApiEndpointStatus | null;
  historyLoadRoute: ApiEndpointStatus | null;
  debugHistoryRoute: ApiEndpointStatus | null;
};

export default function HistoryDebugger() {
  const [debugResults, setDebugResults] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    historyRoute: null,
    historyLoadRoute: null,
    debugHistoryRoute: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test all three API endpoints
      const results = await Promise.allSettled([
        fetch('/api/history').then(res => ({ 
          status: res.status, 
          ok: res.ok,
          data: res.ok ? res.json() : null
        })),
        fetch('/api/history/load').then(res => ({ 
          status: res.status, 
          ok: res.ok,
          data: res.ok ? res.json() : null
        })),
        fetch('/api/debug/history').then(res => ({ 
          status: res.status, 
          ok: res.ok,
          data: res.ok ? res.json() : null
        }))
      ]);
      
      // Process results
      const [historyResult, historyLoadResult, debugHistoryResult] = results;
      
      setApiStatus({
        historyRoute: historyResult.status === 'fulfilled' ? {
          status: historyResult.value.status,
          ok: historyResult.value.ok,
          dataPromise: historyResult.value.data
        } : { error: historyResult.reason },
        
        historyLoadRoute: historyLoadResult.status === 'fulfilled' ? {
          status: historyLoadResult.value.status,
          ok: historyLoadResult.value.ok,
          dataPromise: historyLoadResult.value.data
        } : { error: historyLoadResult.reason },
        
        debugHistoryRoute: debugHistoryResult.status === 'fulfilled' ? {
          status: debugHistoryResult.value.status,
          ok: debugHistoryResult.value.ok,
          dataPromise: debugHistoryResult.value.data
        } : { error: debugHistoryResult.reason }
      });
      
      // Resolve all data promises
      if (historyResult.status === 'fulfilled' && historyResult.value.ok) {
        const historyData = await historyResult.value.data;
        setApiStatus(prev => ({
          ...prev,
          historyRoute: {
            ...prev.historyRoute,
            data: historyData
          }
        }));
      }
      
      if (historyLoadResult.status === 'fulfilled' && historyLoadResult.value.ok) {
        const historyLoadData = await historyLoadResult.value.data;
        setApiStatus(prev => ({
          ...prev,
          historyLoadRoute: {
            ...prev.historyLoadRoute,
            data: historyLoadData
          }
        }));
      }
      
      if (debugHistoryResult.status === 'fulfilled' && debugHistoryResult.value.ok) {
        const debugHistoryData = await debugHistoryResult.value.data;
        setApiStatus(prev => ({
          ...prev,
          debugHistoryRoute: {
            ...prev.debugHistoryRoute,
            data: debugHistoryData
          }
        }));
        
        // Set the main debug results from the debug API
        setDebugResults(debugHistoryData);
      }
      
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
      // Console statement removed for security
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md mt-4">
      <h2 className="text-lg font-bold mb-4">History Database Diagnostics</h2>
      
      <button
        onClick={runTest}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
      >
        {loading ? 'Testing...' : 'Run Database Test'}
      </button>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">
          Error: {error}
        </div>
      )}
      
      {/* API Status Results */}
      {apiStatus.historyRoute !== null && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2">API Endpoint Status</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">/api/history</p>
              <div className="mt-1 text-sm">
                Status: <span className={`font-semibold ${apiStatus.historyRoute.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {apiStatus.historyRoute.status} {apiStatus.historyRoute.ok ? '✅' : 'âŒ'}
                </span>
                {apiStatus.historyRoute.error && (
                  <p className="text-red-600 mt-1">Error: {apiStatus.historyRoute.error.toString()}</p>
                )}
                {apiStatus.historyRoute.data && (
                  <div className="mt-2">
                    <p>Data returned: {apiStatus.historyRoute.data.historyEntries?.length || 0} entries</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">/api/history/load</p>
              <div className="mt-1 text-sm">
                Status: <span className={`font-semibold ${apiStatus.historyLoadRoute?.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {apiStatus.historyLoadRoute?.status} {apiStatus.historyLoadRoute?.ok ? '✅' : 'âŒ'}
                </span>
                {apiStatus.historyLoadRoute?.error && (
                  <p className="text-red-600 mt-1">Error: {apiStatus.historyLoadRoute.error.toString()}</p>
                )}
                {apiStatus.historyLoadRoute?.data && (
                  <div className="mt-2">
                    <p>Data returned: {apiStatus.historyLoadRoute.data.historyEntries?.length || 0} entries</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">/api/debug/history</p>
              <div className="mt-1 text-sm">
                Status: <span className={`font-semibold ${apiStatus.debugHistoryRoute?.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {apiStatus.debugHistoryRoute?.status} {apiStatus.debugHistoryRoute?.ok ? '✅' : 'âŒ'}
                </span>
                {apiStatus.debugHistoryRoute?.error && (
                  <p className="text-red-600 mt-1">Error: {apiStatus.debugHistoryRoute.error.toString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Results */}
      {debugResults && (
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2">Database Test Results</h3>
          
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">Connection Test:</p>
              <span className={debugResults.connectionTest === 'passed' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {debugResults.connectionTest === 'passed' ? 'Passed ✅' : 'Failed âŒ'}
              </span>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">Count Query Test:</p>
              <span className={debugResults.countTest === 'passed' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {debugResults.countTest === 'passed' ? 'Passed ✅' : 'Failed âŒ'}
              </span>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">Sample Entries:</p>
              {debugResults.sampleEntries?.length > 0 ? (
                <div className="mt-2">
                  <p className="text-green-600 mb-2">Found {debugResults.sampleEntries.length} entries in database ✅</p>
                  <div className="max-h-60 overflow-auto">
                    <pre className="text-xs bg-gray-100 p-2 rounded">
                      {JSON.stringify(debugResults.sampleEntries, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-yellow-600 mt-1">
                  No history entries found in database. This could be normal if no history has been recorded.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

