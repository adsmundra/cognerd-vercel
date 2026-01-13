'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface ScrapingLoaderProps {
  url?: string;
}

export function ScrapingLoader({ url }: ScrapingLoaderProps) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0 h-full animate-panel-in">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Loader Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full p-6 border border-blue-100">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">Analyzing Your Website</h3>
          <p className="text-gray-600 max-w-md">
            We're scraping your website data and identifying key information...
          </p>
          {url && (
            <p className="text-sm text-gray-500 mt-4 break-all">
              {url}
            </p>
          )}
        </div>

        {/* Status Steps */}
        <div className="mt-8 space-y-3 text-center">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Fetching website content</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Extracting company information</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <span>Identifying competitors</span>
          </div>
        </div>

        {/* Bottom Tip */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-900">
            <Sparkles className="w-4 h-4" />
            <span>This usually takes 30-60 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
