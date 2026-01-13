'use client';

import React from 'react';
import { Loader2, CheckCircle2, XCircle, Brain, Sparkles, Bot } from 'lucide-react';
import { AnalysisProgressData } from '@/lib/types';

interface AnalysisTile {
  prompt: string;
  providers: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: {
      brandMentioned: boolean;
      brandPosition?: number;
      sentiment: 'positive' | 'neutral' | 'negative';
    };
  }[];
}

interface AnalysisTilesProps {
  tiles: AnalysisTile[];
  currentAnalysis?: AnalysisProgressData;
}

const providerIcons = {
  'OpenAI': <Bot className="h-4 w-4" />,
  'Anthropic': <Brain className="h-4 w-4" />,
  'Google': <Sparkles className="h-4 w-4" />,
  'Perplexity': <Sparkles className="h-4 w-4" />,
  'DeepSeek': <img src="/logos/deepseek.jpeg" alt="DeepSeek" className="h-4 w-4" />,
  'Grok': <img src="/logos/grok.jpeg" alt="Grok" className="h-4 w-4" />,
  'xAI': <img src="/logos/grok.jpeg" alt="Grok" className="h-4 w-4" />,
  'Grok (xAI)': <img src="/logos/grok.jpeg" alt="Grok" className="h-4 w-4" />,
};

const statusIcons = {
  'pending': <div className="h-4 w-4 rounded-full bg-gray-200" />,
  'running': <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  'completed': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'failed': <XCircle className="h-4 w-4 text-red-500" />,
};

export function AnalysisTiles({ tiles }: AnalysisTilesProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table className="caption-bottom text-sm w-full">
        <tbody className="[&_tr:last-child]:border-0">
          {tiles.map((tile, index) => (
            <tr key={index} className="group h-auto w-full bg-white transition-colors hover:bg-gray-50/80 border-b border-gray-100">
              <td className="pl-4 pr-2 py-4 align-top">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-400 transition-transform group-hover:text-gray-600">
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                  <span className="text-lg font-semibold text-gray-400">{index + 1}</span>
                </div>
              </td>
              <td className="px-2 py-4 text-xs font-normal text-gray-800">
                <div className="space-y-2">
                  <div className="font-medium">{tile.prompt}</div>
                  <div className="flex flex-wrap gap-2">
                    {tile.providers.map((provider) => (
                      <div
                        key={provider.name}
                        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md transition-all text-xs ${
                          provider.status === 'running' 
                            ? 'bg-blue-50 border border-blue-200' 
                            : provider.status === 'completed'
                            ? 'bg-green-50 border border-green-200'
                            : provider.status === 'failed'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {providerIcons[provider.name as keyof typeof providerIcons]}
                          <span className="font-medium">{provider.name}</span>
                        </div>
                        {statusIcons[provider.status]}
                        {provider.result && provider.status === 'completed' && (
                          <>
                            {provider.result.brandMentioned && (
                              <span className="text-xs text-gray-600">
                                {provider.result.brandPosition && provider.result.brandPosition > 0 
                                  ? `#${provider.result.brandPosition}` 
                                  : 'Mentioned'}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${
                              provider.result.sentiment === 'positive' ? 'text-green-700' :
                              provider.result.sentiment === 'negative' ? 'text-red-700' :
                              'text-gray-700'
                            }`}>
                              {provider.result.sentiment}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}