'use client';

import { useCustomer, usePricingTable } from 'autumn-js/react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import ProductChangeDialog from '@/components/autumn/product-change-dialog';

// Separate component that uses Autumn hooks
function DynamicPricingContent({ session }: { session: any }) {
  const { customer, attach } = useCustomer();
  const { products, isLoading, error } = usePricingTable();
  const router = useRouter();

  const handleSelectPlan = async (productId: string) => {
    if (!session) {
      router.push('/login');
      return;
    }

    await attach({
      productId,
      dialog: ProductChangeDialog,
    });
  };

  if (isLoading) {
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
          <p className="text-red-600 mb-4">Error loading pricing</p>
          <Button onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Select the perfect plan for your needs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {products?.map((product) => {
            const isActive = customer?.products?.some(p => p.id === product.id);
            const price = product.items?.[0];
            const features = product.items?.slice(1) || [];

            return (
              <div 
                key={product.id} 
                className={`bg-white rounded-lg shadow-lg p-8 ${
                  product.display?.recommend_text ? 'ring-2 ring-blue-500 transform scale-105' : ''
                }`}
              >
                {product.display?.recommend_text && (
                  <div className="bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                    {product.display.recommend_text}
                  </div>
                )}
                
                <h2 className="text-2xl font-bold mb-4">{product.display?.name || product.name}</h2>
                
                {price && (
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{price.display?.primary_text}</span>
                    {price.display?.secondary_text && (
                      <span className="text-gray-600 ml-2">{price.display.secondary_text}</span>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => handleSelectPlan(product.id)}
                  disabled={isActive}
                  className={`w-full mb-6 ${
                    product.display?.recommend_text 
                      ? 'btn-firecrawl-orange' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isActive ? 'Current Plan' : 'Select Plan'}
                </Button>

                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature.display?.primary_text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DynamicPricingPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return <DynamicPricingContent session={session} />;
}