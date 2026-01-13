import React, { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Check, ArrowLeft, Sparkles, Bot, User, Play, Zap, Terminal, Users } from 'lucide-react';
import { Company, AnalysisStage, BrandPrompt } from '@/lib/types';
import { IdentifiedCompetitor, PromptCompletionStatus } from '@/lib/brand-monitor-reducer';
import { getEnabledProviders } from '@/lib/provider-config';

interface AnalysisProgressSectionProps {
  company: Company;
  analyzing: boolean;
  identifiedCompetitors: IdentifiedCompetitor[];
  scrapingCompetitors: boolean;
  analysisProgress: {
    stage: AnalysisStage;
    progress: number;
    message: string;
  };
  prompts: BrandPrompt[];
  customPrompts: string[];
  promptCompletionStatus: PromptCompletionStatus;
  onRemoveCustomPrompt: (prompt: string) => void;
  onAddPromptClick: () => void;
  onAddCompetitorClick: () => void;
  onStartAnalysis: () => void;
  onBack?: () => void;
}

const getProviderIcon = (provider: string, status?: string) => {
  const isGrayscale = status === 'pending' || !status;
  const className = `w-full h-full object-contain transition-all duration-300 ${isGrayscale ? 'opacity-50 grayscale contrast-125' : 'opacity-100 grayscale-0'}`;
  
  switch (provider) {
    case 'OpenAI':
      return <img src="https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B" alt="OpenAI" className={className} />;
    case 'Anthropic':
      return <img src="https://cdn.brandfetch.io/idmJWF3N06/theme/dark/symbol.svg" alt="Anthropic" className={className} />;
    case 'Google':
      return (
        <div className={`w-full h-full flex items-center justify-center transition-all duration-300 ${isGrayscale ? 'opacity-50 grayscale' : 'opacity-100'}`}>
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
      );
    case 'Perplexity':
      return <img src="https://cdn.brandfetch.io/idNdawywEZ/w/800/h/800/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" alt="Perplexity" className={className} />;
    case 'DeepSeek':
      return <img src="/logos/deepseek.jpeg" alt="DeepSeek" className={className} />;
    case 'Grok':
    case 'xAI':
    case 'Grok (xAI)':
      return <img src="/logos/grok.jpeg" alt="Grok" className={className} />;
    default:
      return <div className={`w-full h-full bg-slate-400 rounded transition-all duration-300 ${isGrayscale ? 'opacity-30' : 'opacity-80'}`} />;
  }
};

export function AnalysisProgressSection({
  company,
  analyzing,
  identifiedCompetitors,
  scrapingCompetitors,
  analysisProgress,
  prompts,
  customPrompts,
  promptCompletionStatus,
  onRemoveCustomPrompt,
  onAddPromptClick,
  onAddCompetitorClick,
  onStartAnalysis,
  onBack
}: AnalysisProgressSectionProps) {
  const displayPrompts = prompts;
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

    return (

      <div className="relative w-full h-full min-h-[800px] flex flex-col items-center justify-center p-6 font-sans selection:bg-indigo-100 selection:text-indigo-900">

        

        {/* Background Ambience */}

        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">

           <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[100px] mix-blend-multiply animate-float-slow" />

           <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[100px] mix-blend-multiply animate-float-slow animation-delay-2000" />

        </div>

  

        {/* Main Container Box */}

        <div className={`relative z-10 w-full max-w-7xl h-full flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          

          {/* Dynamic Header */}

          <div className="px-8 pt-8 pb-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-20">

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">

              <div className="flex-1">

                 <div className="flex items-center gap-3 mb-2">

                   {!analyzing && onBack && (

                    <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-700">

                      <ArrowLeft className="w-5 h-5" />

                    </button>

                   )}

                   <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-md ${analyzing ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-500 shadow-sm'}`}>

                      {analyzing ? 'Analysis in Progress' : 'Analysis Setup'}

                   </div>

                 </div>

                 

                 <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">

                   {analyzing ? (

                     <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 animate-gradient-x">

                       Analyzing Brand Voice

                     </span>

                   ) : 'Configure Analysis'}

                 </h1>

                 

                 <p className="text-base text-slate-600 max-w-2xl leading-relaxed">

                    {analyzing 

                      ? 'Our autonomous agents are currently scanning search engines to determine your share of voice and sentiment.'

                      : 'Review the generated search queries below. These prompts are tailored to your industry to extract the most relevant insights.'

                    }

                 </p>

              </div>

  

              {/* Status / Competitors Widget */}

              {!analyzing && (

                <div className="bg-slate-50/50 border border-slate-200/60 shadow-sm rounded-2xl p-4 flex items-center gap-4 animate-scale-in origin-right">

                   <div className="flex flex-col">

                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Comparing Against</span>

                      <div className="flex items-center gap-2">

                        <div className="flex -space-x-2">

                          {identifiedCompetitors.slice(0, 5).map((comp, idx) => {

                               const domain = comp.url ? comp.url.split('/')[0] : undefined;

                               const faviconSrc = comp.metadata?.favicon || (domain

                                 ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

                                 : undefined);

                               return (

                                 <div key={idx} className="w-9 h-9 rounded-full ring-2 ring-white bg-white shadow-sm flex items-center justify-center overflow-hidden transition-transform hover:-translate-y-1 z-0 hover:z-10 border border-slate-100" title={comp.name}>

                                    {faviconSrc ? (

                                      <img src={faviconSrc} alt={comp.name} className="w-full h-full object-contain" />

                                    ) : (

                                      <span className="text-xs font-bold text-slate-400">{comp.name.charAt(0)}</span>

                                    )}

                                 </div>

                               );

                          })}

                        </div>

                        <span className="text-xs font-medium text-slate-500 ml-1">

                           {identifiedCompetitors.length > 5 ? `+${identifiedCompetitors.length - 5}` : ''}

                        </span>

                      </div>

                   </div>

                   

                   <div className="w-px h-10 bg-slate-200 mx-1"></div>

                   

                   <button 

                     onClick={onAddCompetitorClick}

                     className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-white border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm hover:shadow"

                     title="Add Competitor"

                   >

                      <Plus className="w-5 h-5" />

                   </button>

                </div>

              )}

              

              {/* Active Analysis Monitor */}

              {analyzing && analysisProgress && (

                 <div className="flex-1 max-w-md w-full bg-white border border-slate-200 shadow-lg rounded-xl p-5 animate-fade-in-up">

                    <div className="flex justify-between items-center mb-3">

                       <div className="flex items-center gap-2">

                          <span className="relative flex h-2.5 w-2.5">

                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>

                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>

                          </span>

                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{analysisProgress.message}</span>

                       </div>

                       <span className="text-xl font-bold text-slate-800 tabular-nums">{analysisProgress.progress}%</span>

                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">

                       <div 

                         className="h-full bg-blue-600 rounded-full"

                         style={{ width: `${analysisProgress.progress}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}

                       />

                    </div>

                 </div>

              )}

            </div>

          </div>

  

                  {/* Scrollable Content Area */}

  

                  <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 relative scroll-smooth">

  

                     <div className="absolute inset-0 pointer-events-none opacity-[0.3]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

  

                     

  

                     <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">

  

                       {displayPrompts.map((promptData, index) => {
                          const promptText = promptData.prompt;
                          const isCustom = promptData.source === 'user' || customPrompts.includes(promptText);

                          const delay = index * 30;

  

                          

  

                          // Status Determination

  

                          let statusColor = "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md";

  

                          let isRunning = false;

  

                          

  

                          if (analyzing) {

  

                              const statuses = getEnabledProviders().map(p => promptCompletionStatus[promptText.trim()]?.[p.name]);

  

                              isRunning = statuses.some(s => s === 'running');

  

                              const isCompleted = statuses.every(s => s === 'completed');

  

                              

  

                              if (isRunning) {

  

                                  statusColor = "bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-100";

  

                              } else if (isCompleted) {

  

                                  statusColor = "bg-green-50/30 border-green-200";

  

                              }

  

                          }

  

          

  

                          return (

  

                             <div 

  

                               key={`${promptText}-${index}`}

  

                               className={`

  

                                  group relative p-5 rounded-2xl border transition-all duration-300

  

                                  ${statusColor}

  

                                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}

  

                               `}

  

                               style={{ transitionDelay: `${delay}ms` }}

  

                             >

  

                                <div className="flex items-start gap-4">

  

                                   <div className={`

  

                                      w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm

  

                                      ${isCustom ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-white text-slate-500 border-slate-100'}

  

                                   `}>

  

                                      {isCustom ? <User className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}

  

                                   </div>

  

                                   

  

                                   <div className="flex-1 pt-0.5">

  

                                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                         
                                         <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className={`text-[10px] uppercase font-bold px-2 h-5 ${isCustom ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}`}>

                                                {isCustom ? 'User Query' : 'Auto-Generated'}

                                            </Badge>
                                            
                                            {promptData.persona && (
                                                <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 h-5 bg-teal-100 text-teal-700 hover:bg-teal-100 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {promptData.persona}
                                                </Badge>
                                            )}
                                         </div>

  

                                          {!analyzing && (

  

                                            <button onClick={() => onRemoveCustomPrompt(promptText)} className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">

  

                                               <Trash2 className="w-4 h-4" />

  

                                            </button>

  

                                          )}

  

                                      </div>

  

                                      <p className="text-slate-800 font-medium text-sm leading-relaxed">

  

                                         "{promptText}"

  

                                      </p>

  

                                      

  

                                      {/* Provider Status Indicators */}

  

                                      {analyzing && (

  

                                         <div className="mt-3 flex items-center gap-2">

  

                                            {getEnabledProviders().map(config => {

  

                                                const provider = config.name;

  

                                                const status = promptCompletionStatus[promptText.trim()]?.[provider] || 'pending';

  

                                                

  

                                                return (

  

                                                   <div key={provider} className="relative group/tooltip">

  

                                                      <div className={`

  

                                                         w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300

  

                                                         ${status === 'running' ? 'bg-white border-blue-400 shadow-sm scale-110' : 

  

                                                           status === 'completed' ? 'bg-white border-green-300' : 

  

                                                           'bg-slate-50 border-slate-200 opacity-60'}

  

                                                      `}>

  

                                                         {status === 'completed' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <div className="w-3.5 h-3.5">{getProviderIcon(provider, status)}</div>}

  

                                                      </div>

  

                                                      {/* Tooltip */}

  

                                                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] font-medium rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">

  

                                                         {provider}: {status}

  

                                                      </div>

  

                                                   </div>

  

                                                )

  

                                            })}

  

                                         </div>

  

                                      )}

  

                                   </div>

  

                                </div>

  

                             </div>

  

                          );

  

                       })}

  

                     </div>

  

                  </div>

  

                  

  

                  {/* Anchored Footer Action Bar */}

  

                  {!analyzing && (

  

                     <div className="flex-none px-8 py-6 bg-white border-t border-slate-100 z-20">

  

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in-up animation-delay-200">

  

                           

  

                           {/* Left: Summary Stats */}

  

                           <div className="flex items-center gap-6">

  

                              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">

  

                                 <span className="flex items-center gap-2 text-sm font-medium text-slate-700">

  

                                    <Sparkles className="w-4 h-4 text-purple-500" />

  

                                    <span className="font-bold text-slate-900">{displayPrompts.length}</span> Queries

  

                                 </span>

  

                                 <div className="w-px h-4 bg-slate-200" />

  

                                 <span className="flex items-center gap-2 text-sm font-medium text-slate-700">

  

                                    <Zap className="w-4 h-4 text-orange-500" />

  

                                    <span className="font-bold text-slate-900">{getEnabledProviders().length}</span> AI Engines

  

                                 </span>

  

                              </div>

  

                              <p className="text-xs text-slate-400 hidden lg:block">

  

                                 Ready to launch comprehensive analysis

  

                              </p>

  

                           </div>

  

                           

  

                           {/* Right: Actions */}

  

                           <div className="flex items-center gap-3 w-full md:w-auto">

  

                             <button

  

                                onClick={onAddPromptClick}

  

                                className="flex-1 md:flex-none h-12 px-6 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95 flex items-center justify-center gap-2 group"

  

                             >

  

                                <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />

  

                                Add Prompt

  

                             </button>

  

                             <button

  

                                onClick={onStartAnalysis}

  

                                className="flex-1 md:flex-none h-12 px-8 bg-[#155DFC] hover:bg-[#0e4add] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2.5"

  

                             >

  

                                <Play className="w-4 h-4 fill-current" />

  

                                Run Analysis

  

                             </button>

  

                           </div>

  

                        </div>

  

                     </div>

  

                  )}

  

        </div>

      </div>

    );

  }
