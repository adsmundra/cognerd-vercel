'use client';

import { useState } from 'react';
import { useSession, signIn } from '@/lib/auth-client';
import { SessionDebug } from '@/components/debug/session-debug';

export default function DebugOAuthPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testGoogleOAuth = async () => {
    setLoading(true);
    addLog('🚀 Starting Google OAuth test...');
    
    try {
      addLog('📤 Calling signIn.social({ provider: "google" })...');
      
      const response = await signIn.social({
        provider: 'google',
      });
      
      addLog(`📥 Response received: ${JSON.stringify(response, null, 2)}`);
      
      if (response.error) {
        addLog(`❌ Error: ${response.error.message}`);
      } else {
        addLog('✅ OAuth initiated successfully');
        addLog('🔄 Check if browser redirected to Google...');
      }
    } catch (error: any) {
      addLog(`💥 Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    addLog('🔍 Checking session...');
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      addLog(`📊 Session data: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      addLog(`❌ Session check failed: ${error.message}`);
    }
  };

  const testAuthEndpoints = async () => {
    addLog('🧪 Testing auth endpoints...');
    
    const endpoints = [
      '/api/auth/session',
      '/api/auth/test-config',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        addLog(`✅ ${endpoint}: ${response.status} - ${JSON.stringify(data).substring(0, 100)}...`);
      } catch (error: any) {
        addLog(`❌ ${endpoint}: Failed - ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 OAuth Debug Dashboard</h1>
        
        {/* Current Session Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Session Status</h2>
          {session ? (
            <div className="text-green-600">
              ✅ Logged in as: {session.user?.email} ({session.user?.name})
            </div>
          ) : (
            <div className="text-red-600">
              ❌ Not logged in
            </div>
          )}
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button
              onClick={testGoogleOAuth}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : '🔐 Test Google OAuth'}
            </button>
            
            <button
              onClick={checkSession}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              🔍 Check Session
            </button>
            
            <button
              onClick={testAuthEndpoints}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              🧪 Test Endpoints
            </button>
            
            <button
              onClick={() => setLogs([])}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              🗑️ Clear Logs
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click a test button to start debugging.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">🚨 Important Notes</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Why you get 200 without callback URL:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li>The POST /api/auth/sign-in/social returns 200 just to initiate OAuth</li>
              <li>The actual redirect to Google happens in the browser</li>
              <li>You still NEED to add the callback URL to Google Cloud Console</li>
            </ul>
            
            <p className="mt-4"><strong>Required callback URL in Google Cloud Console:</strong></p>
            <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000/api/auth/callback/google</code>
            
            <p className="mt-4"><strong>If still asking to login after 200:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Check if browser redirects to Google (should see accounts.google.com)</li>
              <li>Check if callback URL is properly configured in GCP</li>
              <li>Check browser console for JavaScript errors</li>
              <li>Check if session cookies are being set</li>
            </ul>
          </div>
        </div>
      </div>
      
      <SessionDebug />
    </div>
  );
}