'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  display?: {
    name?: string;
    description?: string;
    recommend_text?: string;
  };
  properties?: {
    is_free?: boolean;
  };
  items: Array<{
    display?: {
      primary_text?: string;
      secondary_text?: string;
    };
  }>;
}

export function PublicPricingTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/autumn/products', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) {
          // If we get a 401, just show static pricing silently
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.products) {
          setProducts(data.products);
        }
        setLoading(false);
      })
      .catch(() => {
        // Silently fall back to static pricing
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // If we can't fetch products (user not logged in), show static pricing
  if (error || products.length === 0) {
    return (
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Starter */}
        <div className="bg-white p-8 rounded-[20px] border border-zinc-200">
          <h3 className="text-2xl font-bold mb-2">Starter</h3>
          <p className="text-zinc-600 mb-6">Perfect for side projects</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-zinc-600">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              100 messages/month
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Basic features
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Community support
            </li>
          </ul>
          <Link
            href="/register"
            className="btn-firecrawl-outline w-full inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-10 px-4"
          >
            Start free
          </Link>
        </div>

        {/* Pro - Featured */}
        <div className="bg-white p-8 rounded-[20px] border-2 border-orange-500 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
          <h3 className="text-2xl font-bold mb-2">Pro</h3>
          <p className="text-zinc-600 mb-6">For growing businesses</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$10</span>
            <span className="text-zinc-600">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited messages
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Advanced features
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority support
            </li>
          </ul>
          <Link
            href="/register"
            className="btn-firecrawl-orange w-full inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-10 px-4"
          >
            Start free trial
          </Link>
        </div>

        {/* Enterprise */}
        <div className="bg-white p-8 rounded-[20px] border border-zinc-200">
          <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
          <p className="text-zinc-600 mb-6">For large teams</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">Custom</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Custom limits
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Custom features
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Dedicated support
            </li>
          </ul>
          <Link
            href="/contact"
            className="btn-firecrawl-outline w-full inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-10 px-4"
          >
            Contact sales
          </Link>
        </div>
      </div>
    );
  }

  // If we have products, render them dynamically
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {products.map((product) => {
        const isRecommended = !!product.display?.recommend_text;
        const mainPrice = product.properties?.is_free
          ? { primary_text: "Free" }
          : product.items[0]?.display;

        return (
          <div
            key={product.id}
            className={`bg-white p-8 rounded-[20px] border ${
              isRecommended ? 'border-2 border-orange-500 relative' : 'border-zinc-200'
            }`}
          >
            {isRecommended && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full text-sm font-medium">
                {product.display.recommend_text}
              </div>
            )}
            <h3 className="text-2xl font-bold mb-2">
              {product.display?.name || product.name}
            </h3>
            {product.display?.description && (
              <p className="text-zinc-600 mb-6">{product.display.description}</p>
            )}
            <div className="mb-6">
              <span className="text-4xl font-bold">
                {mainPrice?.primary_text || '$0'}
              </span>
              {mainPrice?.secondary_text && (
                <span className="text-zinc-600">{mainPrice.secondary_text}</span>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {product.items.slice(product.properties?.is_free ? 0 : 1).map((item, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item.display?.primary_text}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`${
                isRecommended ? 'btn-firecrawl-orange' : 'btn-firecrawl-outline'
              } w-full inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-10 px-4`}
            >
              {product.properties?.is_free ? 'Start free' : 'Get started'}
            </Link>
          </div>
        );
      })}
    </div>
  );
}