'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIResponse } from '@/lib/types';
import { detectBrandMention, detectMultipleBrands } from '@/lib/brand-detection-utils';
import { getBrandDetectionOptions } from '@/lib/brand-detection-config';
import { highlightBrandMentions, segmentsToReactElements } from '@/lib/text-highlighting-utils';

interface HighlightedResponseProps {
  response: AIResponse;
  brandName: string;
  competitors: string[];
  showHighlighting?: boolean;
  highlightClassName?: string;
  renderMarkdown?: boolean;
}

// Clean up response text by removing artifacts
function cleanResponseText(text: string, providerName?: string): string {
  let cleaned = text;
  
  // Remove standalone numbers at the beginning of lines (like "0\n")
  cleaned = cleaned.replace(/^\d+\n/gm, '');
  
  // Remove provider name at the beginning if it exists
  if (providerName) {
    const providerPattern = new RegExp(`^${providerName}\\s*\n?`, 'i');
    cleaned = cleaned.replace(providerPattern, '');
  }
  
  // Remove common provider names at the beginning
  const commonProviders = ['OpenAI', 'Anthropic', 'Google', 'Perplexity'];
  commonProviders.forEach(provider => {
    const pattern = new RegExp(`^${provider}\\s*\n?`, 'i');
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove HTML tags but preserve the content
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleaned.trim();
}

export function HighlightedResponse({
  response,
  brandName,
  competitors,
  showHighlighting = true,
  highlightClassName = 'bg-green-100 text-green-900 px-0.5 rounded font-medium',
  renderMarkdown = true
}: HighlightedResponseProps) {
  // Clean the response text
  const cleanedResponse = cleanResponseText(response.response, response.provider);
  
  // Use detection details if available, otherwise detect on the fly - MUST be before any returns for React hooks
  const detectionResults = React.useMemo(() => {
    if (!showHighlighting) return new Map();
    
    if (response.detectionDetails) {
      // Convert stored details back to detection results format
      const results = new Map();
      
      // Add brand detection
      if (response.detectionDetails.brandMatches && response.detectionDetails.brandMatches.length > 0) {
        results.set(brandName, {
          mentioned: true,
          matches: response.detectionDetails.brandMatches,
          confidence: Math.max(...response.detectionDetails.brandMatches.map(m => m.confidence))
        });
      }
      
      // Add competitor detections
      if (response.detectionDetails.competitorMatches) {
        // Handle both Map and plain object (after serialization)
        if (response.detectionDetails.competitorMatches instanceof Map) {
          response.detectionDetails.competitorMatches.forEach((matches, competitor) => {
            if (matches.length > 0) {
              results.set(competitor, {
                mentioned: true,
                matches,
                confidence: Math.max(...matches.map(m => m.confidence))
              });
            }
          });
        } else {
          // Plain object after serialization
          Object.entries(response.detectionDetails.competitorMatches).forEach(([competitor, matches]) => {
            if (matches && matches.length > 0) {
              results.set(competitor, {
                mentioned: true,
                matches,
                confidence: Math.max(...matches.map((m: any) => m.confidence))
              });
            }
          });
        }
      }
      
      return results;
    } else {
      // Detect on the fly
      const allBrands = [brandName, ...competitors];
      const results = new Map();
      
      allBrands.forEach(brand => {
        const options = getBrandDetectionOptions(brand);
        const result = detectBrandMention(cleanedResponse, brand, options);
        if (result.mentioned) {
          results.set(brand, result);
        }
      });
      
      return results;
    }
  }, [response, brandName, competitors, cleanedResponse, showHighlighting]);
  
  // Generate highlighted segments
  const segments = React.useMemo(() => {
    if (!showHighlighting) return [];
    return highlightBrandMentions(cleanedResponse, detectionResults);
  }, [cleanedResponse, detectionResults, showHighlighting]);
  
  // Convert to React elements
  const elements = segmentsToReactElements(segments, highlightClassName);
  
  // If highlighting is disabled, just return the plain text or markdown
  if (!showHighlighting) {
    if (renderMarkdown) {
      return (
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({children}) => <p className="mb-2">{children}</p>,
            ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
            li: ({children}) => <li className="mb-1">{children}</li>,
            strong: ({children}) => <strong className="font-semibold">{children}</strong>,
            em: ({children}) => <em className="italic">{children}</em>,
            table: ({children}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                  {children}
                </table>
              </div>
            ),
            thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
            tbody: ({children}) => <tbody>{children}</tbody>,
            tr: ({children}) => <tr className="border-b border-gray-200">{children}</tr>,
            th: ({children}) => (
              <th className="border border-gray-300 px-2 py-1 text-left font-semibold bg-gray-100">
                {children}
              </th>
            ),
            td: ({children}) => (
              <td className="border border-gray-300 px-2 py-1">
                {children}
              </td>
            ),
          }}
        >
          {cleanedResponse}
        </ReactMarkdown>
      );
    }
    return <>{cleanedResponse}</>;
  }
  
  if (renderMarkdown) {
    // For markdown with highlighting, render markdown first, then apply highlights to the final text
    return (
      <div className="prose prose-sm max-w-none prose-slate">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
            ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
            li: ({children}) => <li className="text-sm">{children}</li>,
            strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
            em: ({children}) => <em className="italic">{children}</em>,
            h1: ({children}) => <h1 className="text-lg font-bold mb-3 text-gray-900">{children}</h1>,
            h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-gray-900">{children}</h2>,
            h3: ({children}) => <h3 className="text-sm font-semibold mb-2 text-gray-900">{children}</h3>,
            // Proper table rendering
            table: ({children}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                  {children}
                </table>
              </div>
            ),
            thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
            tbody: ({children}) => <tbody>{children}</tbody>,
            tr: ({children}) => <tr className="border-b border-gray-200">{children}</tr>,
            th: ({children}) => (
              <th className="border border-gray-300 px-2 py-1 text-left font-semibold bg-gray-100">
                {children}
              </th>
            ),
            td: ({children}) => (
              <td className="border border-gray-300 px-2 py-1">
                {children}
              </td>
            ),
            // Add code block support
            code: ({children, className}) => {
              if (className?.includes('language-')) {
                return (
                  <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto mb-3">
                    <code>{children}</code>
                  </pre>
                );
              }
              return <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>;
            },
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-3">
                {children}
              </blockquote>
            ),
          }}
        >
          {cleanedResponse}
        </ReactMarkdown>
      </div>
    );
  }
  
  return <div className="whitespace-pre-wrap">{elements}</div>;
}

// Export a simpler version for use in tooltips or previews
export function HighlightedText({
  text,
  brandName,
  competitors = [],
  highlightClassName = 'bg-green-100 text-green-900 px-0.5 rounded'
}: {
  text: string;
  brandName: string;
  competitors?: string[];
  highlightClassName?: string;
}) {
  const detectionResults = React.useMemo(() => {
    const allBrands = [brandName, ...competitors];
    const results = new Map();
    
    allBrands.forEach(brand => {
      const options = getBrandDetectionOptions(brand);
      const result = detectBrandMention(text, brand, options);
      if (result.mentioned) {
        results.set(brand, result);
      }
    });
    
    return results;
  }, [text, brandName, competitors]);
  
  const segments = highlightBrandMentions(text, detectionResults);
  const elements = segmentsToReactElements(segments, highlightClassName);
  
  return <>{elements}</>;
}