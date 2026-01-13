'use client';

import React, { useState, Fragment } from 'react';
import { ProviderComparisonData, Company } from '@/lib/types';
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { CompetitorCell } from './competitor-cell';
import { getConfiguredProviders, PROVIDER_PRIORITY, PROVIDER_CONFIGS } from '@/lib/provider-config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, ReferenceLine } from 'recharts';
import Image from 'next/image';

interface ProviderComparisonMatrixProps {
  data: ProviderComparisonData[];
  brandName: string;
  company?: Company | null;
  competitors?: { 
    name: string; 
    url?: string;
    metadata?: {
      ogImage?: string;
      favicon?: string;
      description?: string;
    };
  }[];
  viewMode?: 'chart' | 'table';
}

// Provider icon mapping (helper for table and chart)
const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'OpenAI':
      return (
        <img 
          src="https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B" 
          alt="OpenAI" 
          className="w-5 h-5 object-contain"
        />
      );
    case 'Anthropic':
      return (
        <img 
          src="https://cdn.brandfetch.io/idmJWF3N06/theme/dark/symbol.svg" 
          alt="Anthropic" 
          className="w-5 h-5 object-contain"
        />
      );
    case 'Google':
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
      );
    case 'Perplexity':
      return (
        <img 
          src="https://cdn.brandfetch.io/idNdawywEZ/w/800/h/800/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" 
          alt="Perplexity" 
          className="w-5 h-5 object-contain"
        />
      );
    case 'DeepSeek':
      return (
        <Image 
          src="/logos/deepseek.jpeg" 
          alt="DeepSeek" 
          width={20}
          height={20}
          className="w-5 h-5 object-contain rounded-sm"
        />
      );
    case 'Grok':
    case 'xAI':
    case 'Grok (xAI)':
      return (
        <Image 
          src="/logos/grok.jpeg" 
          alt="Grok" 
          width={20}
          height={20}
          className="w-5 h-5 object-contain rounded-sm"
        />
      );
    default:
      return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
  }
};

// Generate a fallback URL from competitor name
const generateFallbackUrl = (competitorName: string): string | undefined => {
  // Clean the name for URL generation
  const cleanName = competitorName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .trim();
  
  // Skip if name is too generic or short
  if (cleanName.length < 3 || ['inc', 'llc', 'corp', 'company', 'the'].includes(cleanName)) {
    return undefined;
  }
  
  // Try common domain patterns
  const possibleDomains = [
    `${cleanName}.com`,
    `${cleanName}.io`,
    `${cleanName}.ai`,
    `get${cleanName}.com`,
    `www.${cleanName}.com`
  ];
  
  // Return the most likely domain (usually .com)
  return possibleDomains[0];
};

export function ProviderComparisonMatrix({ data, brandName, competitors, company, viewMode = 'chart' }: ProviderComparisonMatrixProps) {
  // Hooks must be called before any conditional returns
  const [sortColumn, setSortColumn] = useState<string>('competitor');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const getDomainFromUrl = (value?: string | null) => {
    if (!value) return undefined;
    try {
      const withProtocol = value.startsWith('http') ? value : `https://${value}`;
      return new URL(withProtocol).hostname;
    } catch {
      return value.split('/')[0];
    }
  };

  const brandDomain = getDomainFromUrl(company?.url);
  const brandFavicon = company?.favicon || (brandDomain
    ? `https://www.google.com/s2/favicons?domain=${brandDomain}&sz=64`
    : undefined);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600 text-lg mb-2">No comparison data available</p>
        <p className="text-gray-500 text-sm">The analysis may still be processing or no providers returned data.</p>
      </div>
    );
  }

  // Extract unique providers from the data
  const dataProviders = Array.from(new Set(
    data.flatMap(item => Object.keys(item.providers))
  ));
  
  // Sort providers by priority
  const providers = dataProviders.sort((a, b) => {
    // Helper to find priority by name
    const getPriority = (name: string) => {
      // Find config by name
      const config = Object.values(PROVIDER_CONFIGS).find(c => c.name === name);
      const id = config?.id || name.toLowerCase();
      return PROVIDER_PRIORITY[id] || 999;
    };
    
    return getPriority(a) - getPriority(b);
  });
  
  // Get background style based on score
  const getBackgroundStyle = (score: number, isOwn: boolean) => {
    if (!isOwn) {
      return {
        backgroundColor: 'transparent'
      };
    }
    
    const opacity = Math.pow(score / 100, 0.5);
    return {
      backgroundColor: `rgba(21, 93, 252, ${opacity})`,
      border: score > 0 ? '1px solid rgb(21, 93, 252)' : undefined
    };
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDirection === null) {
        setSortColumn('competitor');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sorted data
  const getSortedData = () => {
    return [...data].sort((a, b) => {
      if (sortDirection === null) return 0;
      
      if (sortColumn === 'competitor') {
        return sortDirection === 'asc' 
          ? a.competitor.localeCompare(b.competitor)
          : b.competitor.localeCompare(a.competitor);
      }
      
      const aValue = a.providers[sortColumn]?.visibilityScore || 0;
      const bValue = b.providers[sortColumn]?.visibilityScore || 0;
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDownIcon className="w-4 h-4 opacity-30" />;
    if (sortDirection === 'asc') return <ArrowUpIcon className="w-4 h-4" />;
    if (sortDirection === 'desc') return <ArrowDownIcon className="w-4 h-4" />;
    return <ArrowUpDownIcon className="w-4 h-4" />;
  };

  // If no providers are included, don't render the component
  if (providers.length === 0) return null;

  // High-end corporate palette
  // Matches VisibilityScoreTab colors
  const CHART_COLORS = [
    '#3B82F6', // Blue 500
    '#8B5CF6', // Violet 500
    '#EC4899', // Pink 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#6366F1', // Indigo 500
    '#14B8A6', // Teal 500
    '#F43F5E'  // Rose 500
  ];

  const chartData = providers.map(provider => {
    const point: any = { provider };
    let totalScore = 0;
    let count = 0;

    data.forEach(item => {
      const score = item.providers[provider]?.visibilityScore || 0;
      point[item.competitor] = score;
      totalScore += score;
      count++;
    });

    point['Market Avg'] = count > 0 ? Math.round(totalScore / count) : 0;
    return point;
  });

  // Calculate overall market average for the header stat
  const overallMarketAvg = Math.round(
    chartData.reduce((acc, curr) => acc + curr['Market Avg'], 0) / chartData.length
  );

  // Calculate User's Average Score across all providers
  const userBrandData = data.find(d => d.isOwn);
  let userTotalScore = 0;
  let userProviderCount = 0;
  if (userBrandData) {
     providers.forEach(p => {
        userTotalScore += userBrandData.providers[p]?.visibilityScore || 0;
        userProviderCount++;
     });
  }
  const userAvgScore = userProviderCount > 0 ? Math.round(userTotalScore / userProviderCount) : 0;

  // Custom Axis Tick with Icon
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-12} y={10} width={24} height={24}>
           <div className="flex items-center justify-center w-6 h-6 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
             {getProviderIcon(payload.value)}
           </div>
        </foreignObject>
        <text 
            x={0} 
            y={45} 
            dy={0} 
            textAnchor="middle" 
            fill="#64748B" 
            fontSize={11} 
            fontWeight={600}
        >
            {payload.value}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Sort: Own Brand first, then Market Avg, then others descending
      const sortedPayload = [...payload].sort((a: any, b: any) => {
        const isOwnA = a.dataKey === company?.name || data.find(d => d.competitor === a.dataKey)?.isOwn;
        const isOwnB = b.dataKey === company?.name || data.find(d => d.competitor === b.dataKey)?.isOwn;
        const isAvgA = a.dataKey === 'Market Avg';
        const isAvgB = b.dataKey === 'Market Avg';

        if (isOwnA) return -1;
        if (isOwnB) return 1;
        if (isAvgA) return -1;
        if (isAvgB) return 1;
        return b.value - a.value;
      });
      
      return (
        <div className="bg-white/90 backdrop-blur-sm p-4 shadow-lg rounded-xl z-50 min-w-[240px] border border-slate-100 ring-1 ring-slate-200/50">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
             {getProviderIcon(label)}
             <p className="font-semibold text-slate-900">{label}</p>
          </div>
          <div className="space-y-2">
            {sortedPayload.map((entry: any) => {
              const isOwn = entry.dataKey === company?.name || 
                           data.find(d => d.competitor === entry.dataKey)?.isOwn;
              const isAvg = entry.dataKey === 'Market Avg';
              
              return (
                <div key={entry.name} className={`flex items-center justify-between gap-4 text-xs p-1.5 rounded ${isOwn ? 'bg-blue-50 text-blue-900' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {isAvg ? (
                      <div className="w-4 h-0.5 bg-slate-400 border-t-2 border-dashed border-slate-400" />
                    ) : (
                      <div 
                        className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white`}
                        style={{ backgroundColor: entry.color }}
                      />
                    )}
                    <span className={`truncate max-w-[120px] ${isOwn ? 'font-bold text-slate-900' : isAvg ? 'font-medium text-slate-500 italic' : 'font-medium text-slate-600'}`}>
                      {entry.name}
                    </span>
                  </div>
                  <span className={`font-mono font-bold ${isOwn ? 'text-blue-600' : isAvg ? 'text-slate-400' : 'text-slate-900'}`}>
                    {entry.value}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className={`h-full flex flex-col ${viewMode === 'table' ? 'space-y-6' : ''}`}>
      {viewMode === 'chart' && (
      <div className="flex-1 w-full flex flex-col animate-fade-in-up min-h-0">
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
              onMouseLeave={() => setHoveredSeries(null)}
            >
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#155DFC" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#155DFC" stopOpacity={0.0}/>
                </linearGradient>
              </defs>

              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#E2E8F0" 
                strokeOpacity={0.6}
              />
              
              <XAxis 
                dataKey="provider" 
                axisLine={false} 
                tickLine={false} 
                tick={<CustomXAxisTick />}
                interval={0}
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }} 
                domain={[0, 100]} 
                unit="%"
                dx={-10}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
              
              <Legend 
                content={() => (
                    <div className="flex flex-wrap justify-center gap-6 mt-2 pt-4 border-t border-slate-50 pb-2">
                      {/* Your Brand */}
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#155DFC] ring-2 ring-blue-100"></div>
                          <span className="text-sm font-bold text-slate-800">Your Brand</span>
                      </div>

                      {/* Market Avg */}
                      <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 border-t-2 border-dashed border-slate-400"></div>
                          <span className="text-sm font-medium text-slate-500">Market Avg</span>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-4 bg-slate-200"></div>

                      {/* Competitors */}
                      {competitors?.slice(0, 4).map((comp, i) => (
                          !comp.metadata?.validated ? null : (
                          <div key={comp.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                            <span className="text-sm text-slate-600">{comp.name}</span>
                          </div>
                          )
                      ))}
                      {competitors && competitors.length > 4 && (
                          <span className="text-xs text-slate-400 self-center">+ {competitors.length - 4} others</span>
                      )}
                    </div>
                )} 
              />
              
              {/* Render Market Avg Line */}
              <Line
                type="monotone"
                dataKey="Market Avg"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                connectNulls
              />
              
              {/* Render Competitors first (behind) */}
              {data.filter(item => !item.isOwn).map((item, index) => (
                <Line
                  key={item.competitor}
                  type="monotone"
                  dataKey={item.competitor}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  strokeOpacity={hoveredSeries && hoveredSeries !== item.competitor ? 0.2 : 0.7}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                  onMouseEnter={() => setHoveredSeries(item.competitor)}
                  onMouseLeave={() => setHoveredSeries(null)}
                />
              ))}

              {/* Render Own Brand on top with Area */}
              {data.filter(item => item.isOwn).map((item) => (
                <Area
                  key={item.competitor}
                  type="monotone"
                  dataKey={item.competitor}
                  stroke="#155DFC"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#brandGradient)"
                  dot={{ 
                    r: 5, 
                    fill: '#155DFC', 
                    stroke: '#fff', 
                    strokeWidth: 2,
                    shadowColor: 'rgba(21, 93, 252, 0.5)',
                    shadowBlur: 10
                  }}
                  activeDot={{ 
                    r: 7, 
                    stroke: '#155DFC', 
                    strokeWidth: 0,
                    fill: '#155DFC'
                  }}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
      
      {viewMode === 'table' && (
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm animate-fade-in-up">
        <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="bg-gray-50 border-b border-r border-gray-200 w-[180px]">
              <button 
                onClick={() => handleSort('competitor')} 
                className="w-full p-3 font-medium text-gray-900 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
              >
                Competitors
                {getSortIcon('competitor')}
              </button>
            </th>
            {providers.map((provider, index) => (
              <th 
                key={provider}
                className={`bg-gray-50 border-b ${
                  index < providers.length - 1 ? 'border-r' : ''
                } border-gray-200`}
              >
                <button
                  onClick={() => handleSort(provider)}
                  className="w-full p-3 font-medium text-gray-900 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    {getProviderIcon(provider)}
                    {getSortIcon(provider)}
                  </div>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getSortedData().map((competitor, rowIndex) => {
            const competitorData = competitors?.find(c => 
              c.name === competitor.competitor || 
              c.name.toLowerCase() === competitor.competitor.toLowerCase()
            );
            
            // Generate URL if not found - try to guess from competitor name
            const fallbackUrl = !competitorData?.url ? generateFallbackUrl(competitor.competitor) : undefined;
            const sanitizedUrl = competitorData?.url ? getDomainFromUrl(competitorData.url) : undefined;
            const resolvedUrl = competitor.isOwn
              ? brandDomain
              : sanitizedUrl || fallbackUrl;
            const resolvedFavicon = competitor.isOwn
              ? brandFavicon
              : competitorData?.metadata?.favicon || (sanitizedUrl
                  ? `https://www.google.com/s2/favicons?domain=${sanitizedUrl}&sz=64`
                  : fallbackUrl
                    ? `https://www.google.com/s2/favicons?domain=${fallbackUrl}&sz=64`
                    : undefined);
            
            return (
              <tr key={competitor.competitor} className={rowIndex > 0 ? 'border-t border-gray-200' : ''}>
                <td className="border-r border-gray-200 bg-white">
                  <CompetitorCell 
                    name={competitor.competitor}
                    isOwn={competitor.isOwn}
                    favicon={resolvedFavicon}
                    url={resolvedUrl}
                  />
                </td>
                {providers.map((provider, index) => {
                  const providerData = competitor.providers[provider];
                  const score = providerData?.visibilityScore || 0;
                  
                  return (
                    <td 
                      key={provider} 
                      className={`text-center p-3 ${
                        index < providers.length - 1 ? 'border-r border-gray-200' : ''
                      }`}
                      style={getBackgroundStyle(score, competitor.isOwn)}
                    >
                      <span className="text-black font-bold text-xs">
                        {score}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    )}
    </div>
  );
}