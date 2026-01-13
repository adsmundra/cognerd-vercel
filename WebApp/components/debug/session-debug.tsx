'use client';

import { useSession } from '@/lib/auth-client';
import { useState, useEffect } from 'react';

export function SessionDebug() {
  const { data: session, isPending, error } = useSession();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const data = await response.json();
      setSessionData(data);
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md text-xs">
      <h3 className="font-bold mb-2">🔍 Session Debug</h3>
      
      <div className="space-y-2">
        <div>
          <strong>useSession Hook:</strong>
          <div>- isPending: {isPending ? 'true' : 'false'}</div>
          <div>- error: {error ? 'true' : 'false'}</div>
          <div>- session: {session ? 'exists' : 'null'}</div>
          {session && (
            <div className="ml-2">
              <div>- user.id: {session.user?.id}</div>
              <div>- user.email: {session.user?.email}</div>
              <div>- user.name: {session.user?.name}</div>
            </div>
          )}
        </div>

        <div>
          <strong>Direct API Check:</strong>
          <button 
            onClick={checkSession}
            disabled={loading}
            className="ml-2 px-2 py-1 bg-blue-600 rounded text-xs"
          >
            {loading ? 'Checking...' : 'Check Session'}
          </button>
          {sessionData && (
            <div className="ml-2 mt-1">
              <div>- API response: {sessionData.user ? 'has user' : 'no user'}</div>
              {sessionData.user && (
                <div>- API user.email: {sessionData.user.email}</div>
              )}
            </div>
          )}
        </div>

        <div>
          <strong>Cookies:</strong>
          <div>- Document cookies: {typeof window !== 'undefined' && document.cookie ? 'present' : 'none'}</div>
        </div>

        <div>
          <strong>Local Storage:</strong>
          <div>- Keys: {typeof window !== 'undefined' ? Object.keys(localStorage).length : 'N/A (SSR)'}</div>
        </div>
      </div>
    </div>
  );
}