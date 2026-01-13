'use client';

import { useSession } from '@/lib/auth-client';
import { useState } from 'react';

export default function TestSessionPage() {
  const { data: session, isPending, error } = useSession();
  const [apiSession, setApiSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkApiSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const data = await response.json();
      setApiSession(data);
    } catch (err) {
      console.error('API session check failed:', err);
      setApiSession({ error: 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Session Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* useSession Hook */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">useSession Hook</h2>
            <div className="space-y-2 text-sm">
              <div><strong>isPending:</strong> {isPending ? 'true' : 'false'}</div>
              <div><strong>error:</strong> {error ? 'true' : 'false'}</div>
              <div><strong>session:</strong> {session ? 'exists' : 'null'}</div>
              
              {session && (
                <div className="mt-4 p-3 bg-green-50 rounded">
                  <div><strong>User ID:</strong> {session.user?.id}</div>
                  <div><strong>Email:</strong> {session.user?.email}</div>
                  <div><strong>Name:</strong> {session.user?.name}</div>
                  <div><strong>Image:</strong> {session.user?.image ? 'Yes' : 'No'}</div>
                  <div><strong>Email Verified:</strong> {session.user?.emailVerified ? 'Yes' : 'No'}</div>
                </div>
              )}
              
              {!session && !isPending && (
                <div className="mt-4 p-3 bg-red-50 rounded text-red-700">
                  No session found
                </div>
              )}
            </div>
          </div>

          {/* API Session Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">API Session Check</h2>
            <button
              onClick={checkApiSession}
              disabled={loading}
              className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check API Session'}
            </button>
            
            {apiSession && (
              <div className="text-sm">
                <pre className="bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(apiSession, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Browser Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Browser Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Cookies:</strong>
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                {typeof document !== 'undefined' ? document.cookie || 'No cookies' : 'Loading...'}
              </div>
            </div>
            <div>
              <strong>Local Storage Keys:</strong>
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                {typeof localStorage !== 'undefined' ? 
                  Object.keys(localStorage).join(', ') || 'No keys' : 
                  'Loading...'}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">🔍 How to Use This Page</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Before OAuth:</strong> Both sections should show "No session"</p>
            <p><strong>After OAuth:</strong> Both sections should show user data</p>
            <p><strong>If only one works:</strong> There's a mismatch between client and server session</p>
            <p><strong>If neither works:</strong> OAuth flow didn't create a session</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 space-x-4">
          <a href="/login" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
            Go to Login
          </a>
          <a href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Go to Dashboard
          </a>
          <a href="/debug-oauth" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Debug OAuth
          </a>
        </div>
      </div>
    </div>
  );
}