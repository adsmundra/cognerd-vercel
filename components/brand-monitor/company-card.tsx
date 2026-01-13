'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Building2, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Company } from '@/lib/types';
import Image from 'next/image';

interface CompanyCardProps {
  company: Company;
  onAnalyze: () => void;
  analyzing: boolean;
  showCompetitors?: boolean;
  identifiedCompetitors?: Array<{ 
    name: string; 
    url?: string;
    metadata?: {
      ogImage?: string;
      favicon?: string;
      description?: string;
      validated?: boolean;
    };
    loading?: boolean;
  }>;
  onRemoveCompetitor?: (index: number) => void;
  onAddCompetitor?: () => void;
  onContinueToAnalysis?: () => void;
}

export function CompanyCard({ 
  company, 
  onAnalyze, 
  analyzing,
  showCompetitors = false,
  identifiedCompetitors = [],
  onRemoveCompetitor,
  onAddCompetitor,
  onContinueToAnalysis 
}: CompanyCardProps) {
  const [logoError, setLogoError] = React.useState(false);
  const [faviconError, setFaviconError] = React.useState(false);
  
  // Validate URLs
  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  const validLogoUrl = isValidUrl(company.logo) ? company.logo : null;
  const validFaviconUrl = isValidUrl(company.favicon) ? company.favicon : null;

  return (
    <Card className="p-2 bg-card text-card-foreground gap-6 rounded-xl border py-6 shadow-sm border-gray-200 overflow-hidden transition-all hover:shadow-lg">
      <div className="flex">
        {/* Left side - OG Image */}
        <div className="relative w-80 h-48 ml-4 overflow-hidden">
          {validLogoUrl && !logoError ? (
            <div className="absolute inset-0 pr-4 py-4">
              <Image
                src={validLogoUrl}
                alt=""
                fill
                className="object-contain"
                sizes="320px"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-16 w-16 rounded-xl bg-white/80 shadow-md border border-gray-200 flex items-center justify-center p-2">
                {validFaviconUrl && !faviconError ? (
                  <Image
                    src={validFaviconUrl}
                    alt={`${company.name} logo`}
                    width={32}
                    height={32}
                    className="object-contain w-8 h-8"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
            </div>
          )}
          
          {/* Website link overlay on image */}
          <a
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-md group"
          >
            <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
          </a>
        </div>

        {/* Right side - Content */}
        <div className="flex-1 p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {company.industry && (
                  <Badge variant="secondary">
                    {company.industry}
                  </Badge>
                )}
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {new URL(company.url).hostname}
                </span>
              </div>
            </div>
            <button 
              onClick={onAnalyze} 
              disabled={analyzing}
              className="h-9 rounded-[10px] text-sm font-medium flex items-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 bg-[#155DFC] text-[#fff] hover:bg-[#090376] disabled:bg-[#8c8885] disabled:hover:bg-[#8c8885] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#171310,_0px_1px_3px_0px_rgba(58,_33,_8,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#171310,_0px_1px_2px_0px_rgba(58,_33,_8,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100 px-4 py-1"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                'Identify Competitors'
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4 ">
            {company.description}
          </p>

          {/* Keywords inline */}
          {company.scrapedData?.keywords && company.scrapedData.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {company.scrapedData.keywords.slice(0, 6).map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {keyword}
                </span>
              ))}
              {company.scrapedData.keywords.length > 6 && (
                <span className="text-xs text-gray-500">
                  +{company.scrapedData.keywords.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Competitors Section */}
      {showCompetitors && identifiedCompetitors.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-8 py-6">
            <div className="mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Competitors</h3>
                <p className="text-sm text-gray-500">We'll compare {company.name} against these {identifiedCompetitors.length} competitors</p>
              </div>
            </div>
              
              <div className="grid grid-cols-3 gap-4">
                {identifiedCompetitors.map((competitor, idx) => (
                  <div 
                    key={idx} 
                    className="group relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all opacity-0 animate-fade-up"
                    style={{ 
                      animationDelay: `${idx * 50}ms`,
                      animationFillMode: 'forwards',
                      animationDuration: '400ms'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Favicon */}
                      <div className="w-10 h-10 flex-shrink-0">
                        {(() => {
                          const domain = competitor.url ? competitor.url.split('/')[0] : undefined;
                          const faviconSrc = competitor.metadata?.favicon || (domain
                            ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                            : undefined);

                          if (!faviconSrc) {
                            return (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-gray-400" />
                              </div>
                            );
                          }

                          return (
                            <img 
                              src={faviconSrc}
                              alt=""
                              className="w-10 h-10 rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const placeholder = document.createElement('div');
                                placeholder.className = 'w-10 h-10 bg-gray-100 rounded flex items-center justify-center';
                                placeholder.innerHTML = '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                                e.currentTarget.parentElement!.appendChild(placeholder);
                              }}
                            />
                          );
                        })()}
                      </div>
                      
                      {/* Name and URL */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900 text-sm">{competitor.name}</span>
                          {competitor.url && (
                            <a 
                              href={competitor.url.startsWith('http') ? competitor.url : `https://${competitor.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {competitor.url && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{competitor.url}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove button */}
                    {onRemoveCompetitor && (
                      <button
                        onClick={() => onRemoveCompetitor(idx)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-4 mt-6 pt-6 border-t">
                {onAddCompetitor && (
                  <button
                    onClick={onAddCompetitor}
                    className="h-10 px-4 rounded-[10px] text-sm font-medium flex items-center gap-1 transition-all duration-200 bg-[#155DFC] text-white hover:bg-[#090376] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#110A8B,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(23, 13, 242, 58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#110A8B,_0px_1px_3px_0px_rgba(23, 13, 242, 40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#110A8B,_0px_1px_2px_0px_rgba(23, 13, 242, 30%)]"
                  >
                    <Plus className="w-4 h-4" />
                    Add Competitor
                  </button>
                )}
                
                <div className="flex-1" />
                
                {onContinueToAnalysis && (
                  <button
                    onClick={onContinueToAnalysis}
                    className="h-10 px-6 rounded-[10px] text-sm font-medium flex items-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 bg-[#155DFC] text-[#fff] hover:bg-[#090376] disabled:bg-[#8c8885] disabled:hover:bg-[#8c8885] [box-shadow:inset_0px_-2.108433723449707px_0px_0px_#171310,_0px_1.2048193216323853px_6.325301647186279px_0px_rgba(58,_33,_8,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#171310,_0px_1px_3px_0px_rgba(58,_33,_8,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#171310,_0px_1px_2px_0px_rgba(58,_33,_8,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100"
                  >
                    Continue to Analysis
                  </button>
                )}
              </div>
            </div>
        </div>
      )}
    </Card>
  );
}
