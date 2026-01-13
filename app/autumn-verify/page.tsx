'use client';

import { useCustomer } from '@/hooks/useAutumnCustomer';
import { useSession } from '@/lib/auth-client';
import { useEffect } from 'react';

// Separate component that uses Autumn hooks
function AutumnVerifyContent({ session }: { session: any }) {
  const { customer, isLoading, error } = useCustomer();

  useEffect(() => {
    if (customer) {
      console.log('Autumn Customer:', customer);
    }
  }, [customer]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Autumn Integration Verification</h1>
        
        <div className="space-y-6">
          {/* Auth Session Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Auth Session Status</h2>
            {session ? (
              <div className="space-y-2">
                <p className="text-green-600">✓ Logged in</p>
                <p><strong>User ID:</strong> {session.user?.id}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Name:</strong> {session.user?.name || 'Not set'}</p>
              </div>
            ) : (
              <p className="text-red-600">✗ Not logged in</p>
            )}
          </div>

          {/* Autumn Customer Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Autumn Customer Status</h2>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : error ? (
              <div className="text-red-600">
                <p>✗ Error loading customer</p>
                <pre className="mt-2 text-sm bg-red-50 p-2 rounded">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            ) : customer ? (
              <div className="space-y-2">
                <p className="text-green-600">✓ Customer found in Autumn</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-blue-600 hover:underline">
                    View customer data (click to expand)
                  </summary>
                  <pre className="mt-2 text-sm bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(customer, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-yellow-600">
                <p>⚠ No customer data</p>
                <p className="text-sm mt-2">
                  {session ? 'Customer may not be synced to Autumn yet.' : 'Please log in first.'}
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Check the browser console for the logged "Autumn Customer" object</li>
              <li>Verify in your Autumn dashboard at <a href="https://app.useautumn.com/sandbox/customers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://app.useautumn.com/sandbox/customers</a> that the customer was created</li>
              <li>The customer ID in Autumn should match your auth user ID: <code className="bg-white px-2 py-1 rounded">{session?.user?.id || 'Not logged in'}</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AutumnVerifyPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <AutumnVerifyContent session={session} />;
}