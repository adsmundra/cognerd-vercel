'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/auth-client';

interface Product {
  id: string;
  name: string;
  display?: {
    name?: string;
    description?: string;
    recommend_text?: string;
    button_text?: string;
  };
  properties?: {
    is_free?: boolean;
  };
  items?: Array<{
    display?: {
      primary_text?: string;
      secondary_text?: string;
    };
  }>;
}

export default function PublicPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/autumn/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (productId: string) => {
    if (session) {
      // If logged in, go to the regular pricing page for purchasing
      router.push(`/pricing#${productId}`);
    } else {
      // If not logged in, go to register
      router.push('/register');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchProducts}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            {session ? 
              'Select the perfect plan for your needs' : 
              'Sign up to get started with any plan'
            }
          </p>
          {session && (
            <p className="text-sm text-gray-500 mt-2">
              Logged in as: {session.user?.email}
            </p>
          )}
        </div>

        {/* Product Grid */}
        <div className={`grid gap-8 max-w-6xl mx-auto ${
          products.length === 2 ? 'md:grid-cols-2' : 
          products.length === 3 ? 'lg:grid-cols-3' : 
          'md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {products.map((product) => {
            const isRecommended = product.display?.recommend_text;
            const isFree = product.properties?.is_free;
            
            // Get the main price display
            const priceDisplay = isFree ? 
              { primary_text: 'Free', secondary_text: '' } : 
              product.items?.[0]?.display || {};

            // Get feature items
            const features = isFree ? product.items : product.items?.slice(1) || [];

            return (
              <div 
                key={product.id}
                className={`bg-white rounded-lg shadow-lg p-8 ${
                  isRecommended ? 'border-2 border-blue-500 relative' : ''
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
                    {product.display.recommend_text}
                  </div>
                )}
                
                <h2 className="text-2xl font-bold mb-4">
                  {product.display?.name || product.name}
                </h2>
                
                {product.display?.description && (
                  <p className="text-gray-600 mb-6">{product.display.description}</p>
                )}
                
                <div className="text-4xl font-bold mb-6">
                  {priceDisplay.primary_text}
                  {priceDisplay.secondary_text && (
                    <span className="text-lg font-normal text-gray-500 ml-2">
                      {priceDisplay.secondary_text}
                    </span>
                  )}
                </div>
                
                <ul className="space-y-3 mb-8">
                  {features.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <span>{item.display?.primary_text}</span>
                        {item.display?.secondary_text && (
                          <span className="text-sm text-gray-500 block">
                            {item.display.secondary_text}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(product.id)}
                  variant={isRecommended ? 'default' : 'outline'}
                  className="w-full"
                >
                  {session ? 
                    (product.display?.button_text || 'Select Plan') : 
                    'Sign Up to Get Started'
                  }
                </Button>
              </div>
            );
          })}
        </div>

        {/* No products fallback */}
        {(!products || products.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">No pricing plans available at the moment.</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">All Plans Include</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">SSL Encryption</h3>
              <p className="text-gray-600">Secure data transmission</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">99.9% Uptime</h3>
              <p className="text-gray-600">Reliable service guarantee</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">No Setup Fees</h3>
              <p className="text-gray-600">Start immediately</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}