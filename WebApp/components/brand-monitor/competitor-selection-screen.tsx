'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Company } from '@/lib/types';
import Image from 'next/image';
import { IdentifiedCompetitor } from '@/lib/brand-monitor-reducer';

interface CompetitorSelectionScreenProps {
  company: Company;
  identifiedCompetitors: IdentifiedCompetitor[];
  onRemoveCompetitor: (index: number) => void;
  onAddCompetitor: () => void;
  onContinueToNextStep: () => void;
  isLoading?: boolean;
}

export function CompetitorSelectionScreen({
  company,
  identifiedCompetitors,
  onRemoveCompetitor,
  onAddCompetitor,
  onContinueToNextStep,
  isLoading = false
}: CompetitorSelectionScreenProps) {
  const [competitorErrors, setCompetitorErrors] = React.useState<Record<number, boolean>>({});

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center animate-panel-in min-h-0 h-full">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full min-h-0">
        <div className="w-full space-y-6 h-full flex flex-col">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Review & Add Competitors</h2>
            <p className="text-gray-600">
              We've identified key competitors for {company.name}. Review them below and add or remove as needed before generating analysis prompts.
            </p>
          </div>

          {/* Competitors List Card */}
          <Card className="flex-1 flex flex-col bg-white border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Identified Competitors</CardTitle>
                  <CardDescription className="mt-1">
                    {identifiedCompetitors.length} competitor{identifiedCompetitors.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <Button
                  onClick={onAddCompetitor}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Competitor
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto p-6">
              {identifiedCompetitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No competitors identified yet</p>
                  <p className="text-gray-500 text-sm mb-6">
                    Add competitors manually to compare against {company.name}
                  </p>
                  <Button
                    onClick={onAddCompetitor}
                    variant="default"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Competitor
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {identifiedCompetitors.map((competitor, index) => {
                    const validUrl = isValidUrl(competitor.url) ? competitor.url : null;
                    const hasError = competitorErrors[index] || false;
                    
                    // improved favicon logic
                    const getDomain = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };
                    const domain = validUrl ? getDomain(validUrl) : null;
                    
                    const faviconUrl = !hasError 
                        ? (competitor.metadata?.favicon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null))
                        : null;

                    return (
                      <div
                        key={index}
                        className="group relative border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-gray-300"
                      >
                        {/* Remove Button */}
                        <button
                          onClick={() => onRemoveCompetitor(index)}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                          title="Remove competitor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Content */}
                        <div className="flex gap-4 pr-8">
                          {/* Competitor Logo/Favicon */}
                          <div className="flex-shrink-0">
                            <div className="relative h-12 w-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                              {faviconUrl ? (
                                <Image
                                  src={faviconUrl}
                                  alt={competitor.name}
                                  width={32}
                                  height={32}
                                  className="object-contain w-8 h-8"
                                  onError={() =>
                                    setCompetitorErrors((prev) => ({ ...prev, [index]: true }))
                                  }
                                />
                              ) : (
                                <Building2 className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Competitor Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 truncate text-sm">
                                  {competitor.name}
                                </h3>
                                {competitor.url && (
                                  <p className="text-xs text-gray-500 truncate mt-1">
                                    {competitor.url}
                                  </p>
                                )}
                              </div>
                            </div>

                            {competitor.metadata?.description && (
                              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                {competitor.metadata.description}
                              </p>
                            )}

                            {competitor.loading && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                Loading...
                              </Badge>
                            )}

                            {competitor.metadata?.validated && (
                              <Badge variant="default" className="mt-2 text-xs bg-green-100 text-green-700 hover:bg-green-100">
                                Validated
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              {identifiedCompetitors.length} competitor{identifiedCompetitors.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={onContinueToNextStep}
              disabled={isLoading}
              size="lg"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Generating prompts...' : 'Continue to Prompts'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
