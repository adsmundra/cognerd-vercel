'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StaticProduct {
  id: string;
  name?: string;
  description?: string;
  recommendText?: string;
  price: {
    primaryText: string;
    secondaryText?: string;
  };
  items: Array<{
    primaryText: string;
    secondaryText?: string;
  }>;
}

interface StaticPricingTableProps {
  products: StaticProduct[];
}

export default function StaticPricingTable({ products }: StaticPricingTableProps) {
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (productId: string) => {
    setLoadingProductId(productId);
    // Redirect to register page with the product ID
    router.push(`/register?plan=${productId}`);
  };

  const hasRecommended = products.some((p) => p.recommendText);

  return (
    <div className="flex items-center flex-col">
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] w-full gap-2",
          hasRecommended && "!py-10"
        )}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className={cn(
              "w-full h-full py-6 text-foreground border rounded-lg shadow-sm max-w-xl",
              product.recommendText &&
                "lg:-translate-y-6 lg:shadow-lg dark:shadow-zinc-800/80 lg:h-[calc(100%+48px)] bg-secondary/40"
            )}
          >
            {product.recommendText && (
              <div className="bg-black absolute border text-white text-sm font-medium lg:rounded-full px-3 lg:py-0.5 lg:top-4 lg:right-4 top-[-1px] right-[-1px] rounded-bl-lg">
                {product.recommendText}
              </div>
            )}
            <div
              className={cn(
                "flex flex-col h-full flex-grow",
                product.recommendText && "lg:translate-y-6"
              )}
            >
              <div className="h-full">
                <div className="flex flex-col">
                  <div className="pb-4">
                    <h2 className="text-2xl font-semibold px-6 truncate">
                      {product.name || product.id}
                    </h2>
                    {product.description && (
                      <div className="text-sm text-muted-foreground px-6 h-8">
                        <p className="line-clamp-2">{product.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-2">
                    <h3 className="font-semibold h-16 flex px-6 items-center border-y mb-4 bg-secondary/40">
                      <div className="line-clamp-2">
                        {product.price.primaryText}{' '}
                        {product.price.secondaryText && (
                          <span className="font-normal text-muted-foreground mt-1">
                            {product.price.secondaryText}
                          </span>
                        )}
                      </div>
                    </h3>
                  </div>
                </div>
                {product.items.length > 0 && (
                  <div className="flex-grow px-6 mb-6">
                    <div className="space-y-3">
                      {product.items.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span>{item.primaryText}</span>
                            {item.secondaryText && (
                              <span className="text-sm text-muted-foreground">
                                {item.secondaryText}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className={cn("px-6", product.recommendText && "lg:-translate-y-12")}>
                <button
                  onClick={() => handleSignup(product.id)}
                  disabled={loadingProductId === product.id}
                  className={cn(
                    "w-full py-3 px-4 group overflow-hidden relative transition-all duration-300 border rounded-[10px] inline-flex items-center justify-center whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50",
                    product.recommendText ? "btn-firecrawl-orange" : "btn-firecrawl-default"
                  )}
                >
                  {loadingProductId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between w-full transition-transform duration-300 group-hover:-translate-y-[150%]">
                        <span>Get Started</span>
                        <span className="text-sm">→</span>
                      </div>
                      <div className="flex items-center justify-between w-full absolute inset-x-0 px-4 translate-y-[150%] transition-transform duration-300 group-hover:translate-y-0">
                        <span>Get Started</span>
                        <span className="text-sm">→</span>
                      </div>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}