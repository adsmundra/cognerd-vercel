import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CompetitorRanking, Company } from '@/lib/types';
import { IdentifiedCompetitor } from '@/lib/brand-monitor-reducer';
import { TrendingUp, TrendingDown, Minus, Crown, Target, ExternalLink, Lightbulb, AlertTriangle, Info, Sparkles } from 'lucide-react';

interface VisibilityScoreTabProps {
  competitors: CompetitorRanking[];
  brandData: CompetitorRanking;
  identifiedCompetitors: IdentifiedCompetitor[];
  company?: Company | null;
}

export function VisibilityScoreTab({
  competitors,
  brandData,
  identifiedCompetitors,
  company
}: VisibilityScoreTabProps) {
  const [fomoIndex, setFomoIndex] = useState(0);

  const fomoStatements = [
    "Did you know? Brands invisible in AI search lose up to 15% of high-intent traffic.",
    "Fact: 40% of Gen Z uses AI instead of Google for product discovery. Are you there?",
    "Alert: Your competitors are already optimizing for ChatGPT. Don't get left behind.",
    "Insight: Being the #1 recommendation in AI chat is the new SEO rank #1.",
    "Warning: AI hallucinations can damage your brand reputation if data isn't managed.",
    "Stat: 70% of AI-driven purchases happen without a single click to a website.",
    "Reality Check: If AI doesn't know your pricing, it recommends your competitor.",
    "Trend: Voice and AI search are merging. Is your brand conversational-ready?",
    "Did you know? 1 in 3 users accept the first AI recommendation as truth.",
    "Tip: GEO (Generative Engine Optimization) is the fastest growing marketing channel.",
    "Fact: Brands with high AI visibility see a 20% lower CAC.",
    "Alert: Missing from Perplexity's citations? You're missing authority.",
    "Insight: AI models update their knowledge bases weekly. Are you tracking changes?",
    "Warning: Ignoring AI search today is like ignoring Mobile in 2010.",
    "Stat: AI-referred leads convert 3x higher than traditional organic search.",
    "Reality Check: Your 'About Us' page isn't enough. AI needs structured facts.",
    "Trend: 'Zero-click' attribution is rising. Visibility is the only metric that matters.",
    "Did you know? 50% of B2B buyers consult AI for vendor shortlisting.",
    "Tip: Consistent brand mentions across sources train AI to trust you.",
    "Fact: The first mover advantage in GEO is closing fast. Act now."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFomoIndex((prev) => (prev + 1) % fomoStatements.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const getFomoIcon = (text: string) => {
    if (text.startsWith("Warning") || text.startsWith("Alert")) {
        return <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><AlertTriangle className="w-4 h-4" /></div>;
    }
    if (text.startsWith("Tip") || text.startsWith("Did you know")) {
        return <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Lightbulb className="w-4 h-4" /></div>;
    }
    if (text.startsWith("Stat") || text.startsWith("Trend")) {
        return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><TrendingUp className="w-4 h-4" /></div>;
    }
    if (text.startsWith("Fact") || text.startsWith("Reality")) {
        return <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Info className="w-4 h-4" /></div>;
    }
    return <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Sparkles className="w-4 h-4" /></div>;
  };

  const topCompetitor = competitors.filter(c => !c.isOwn)[0];
  const brandRank = competitors.findIndex(c => c.isOwn) + 1;
  const difference = topCompetitor ? brandData.visibilityScore - topCompetitor.visibilityScore : 0;

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
  const brandLogoGuess = company?.logo || (brandDomain ? `https://${brandDomain}/apple-touch-icon.png` : undefined);
  
  // Custom colors matching the platform theme
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

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Main Content Card */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl h-full flex flex-col overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-blue-100 rounded-lg">
                   <Target className="w-4 h-4 text-blue-600" />
                 </div>
                 <CardTitle className="text-lg font-bold text-slate-900">Visibility Analysis</CardTitle>
              </div>
              <CardDescription className="text-slate-500 pl-8">
                Share of voice distribution across AI search engines
              </CardDescription>
            </div>
            
            <div className="flex flex-col items-end">
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-black text-slate-900 tracking-tight">{brandData.visibilityScore}</span>
                 <span className="text-lg font-medium text-slate-400">%</span>
               </div>
               <div className="flex items-center gap-1.5 mt-1 text-sm font-medium">
                  {difference > 0 ? (
                    <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{difference.toFixed(1)}% vs #2
                    </span>
                  ) : difference < 0 ? (
                    <span className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {difference.toFixed(1)}% vs #1
                    </span>
                  ) : (
                    <span className="flex items-center text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Minus className="w-3 h-3 mr-1" />
                      Equal to #1
                    </span>
                  )}
                  <span className="text-slate-400">Total Score</span>
               </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 flex-1 flex flex-col lg:flex-row gap-12 items-center justify-center">
            {/* Chart Section */}
            <div className="relative w-72 h-72 lg:w-96 lg:h-96 flex-shrink-0">
              {/* Outer Glow Ring */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl animate-pulse" />
              
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#155DFC" />
                    </linearGradient>
                    <filter id="glow" height="130%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> 
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feFlood floodColor="#155DFC" floodOpacity="0.3"/>
                        <feComposite in2="offsetblur" operator="in"/>
                        <feMerge> 
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                  </defs>
                  <Pie
                    data={competitors.slice(0, 8).map((competitor) => ({
                      name: competitor.name,
                      value: competitor.visibilityScore,
                      isOwn: competitor.isOwn
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={6}
                    stroke="none"
                  >
                    {competitors.slice(0, 8).map((competitor, idx) => (
                      <Cell 
                        key={`cell-${idx}`} 
                        fill={competitor.isOwn ? 'url(#brandGradient)' : CHART_COLORS[idx % CHART_COLORS.length]}
                        filter={competitor.isOwn ? 'url(#glow)' : ''}
                        className="transition-all duration-300 hover:opacity-90 cursor-pointer outline-none focus:outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                            <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-slate-700">
                                <p className="font-semibold mb-1">{data.name}</p>
                                <p className="text-slate-300">
                                    Visibility: <span className="text-white font-bold">{data.value}%</span>
                                </p>
                            </div>
                        );
                        }
                        return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Stat */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="w-12 h-12 mx-auto bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-1">
                     <Crown className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">#{brandRank}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Market Rank</div>
              </div>
            </div>
            
            {/* Detailed Legend / List */}
            <div className="w-full max-w-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                 Competitor Breakdown
              </h4>
              
              {competitors.slice(0, 8).map((competitor, idx) => {
                const competitorData = identifiedCompetitors.find(c => 
                  c.name === competitor.name || 
                  c.name.toLowerCase() === competitor.name.toLowerCase()
                );
                const competitorDomain = competitorData?.url ? getDomainFromUrl(competitorData.url) : undefined;
                const faviconUrl = competitor.isOwn
                  ? brandFavicon || null
                  : competitorData?.metadata?.favicon || (competitorDomain
                      ? `https://www.google.com/s2/favicons?domain=${competitorDomain}&sz=64`
                      : null);
                const logoGuess = competitor.isOwn
                  ? brandLogoGuess || null
                  : (competitorDomain ? `https://${competitorDomain}/apple-touch-icon.png` : null);
                
                const color = competitor.isOwn ? '#155DFC' : CHART_COLORS[idx % CHART_COLORS.length];
                
                return (
                  <div 
                    key={idx} 
                    className={`
                        group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 border border-transparent
                        ${competitor.isOwn 
                           ? 'bg-blue-50/50 border-blue-100 shadow-sm' 
                           : 'hover:bg-slate-50 hover:border-slate-100'}
                    `}
                  >
                    {/* Color Indicator */}
                    <div 
                      className="w-1.5 h-8 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    
                    {/* Favicon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-sm flex-shrink-0 p-1">
                        {faviconUrl ? (
                          <img 
                            src={faviconUrl}
                            alt={competitor.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.querySelector('.fallback-icon')!.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`fallback-icon w-full h-full flex items-center justify-center text-[10px] font-bold rounded ${competitor.isOwn ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'} ${faviconUrl ? 'hidden' : ''}`}>
                          {competitor.name.charAt(0)}
                        </div>
                    </div>
                    
                    {/* Text Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm truncate font-semibold ${competitor.isOwn ? 'text-slate-900' : 'text-slate-700'}`}>
                            {competitor.name}
                        </span>
                        {competitor.isOwn && (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-blue-100 text-blue-700 border-0">YOU</Badge>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                         <div 
                           className="h-full rounded-full" 
                           style={{ width: `${competitor.visibilityScore}%`, backgroundColor: color }}
                         />
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right pl-2">
                        <span className="block text-sm font-bold text-slate-900 tabular-nums">
                            {competitor.visibilityScore}%
                        </span>
                    </div>
                  </div>
                );
              })}
            </div>
        </CardContent>

        {/* FOMO Carousel Footer */}
        <div className="bg-slate-50/50 border-t border-slate-100 p-4 mt-auto">
            <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto animate-fade-in">
                <div className="flex-shrink-0 transition-all duration-500">
                    {getFomoIcon(fomoStatements[fomoIndex])}
                </div>
                <p className="text-sm font-medium text-slate-600 transition-all duration-500 min-h-[20px]">
                   {fomoStatements[fomoIndex]}
                </p>
            </div>
        </div>
      </Card>
    </div>
  );
}