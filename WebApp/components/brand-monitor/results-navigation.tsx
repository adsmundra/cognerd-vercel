import React from 'react';
import { ResultsTab } from '@/lib/brand-monitor-reducer';
import { 
  BarChart2, 
  MessageSquare, 
  Trophy, 
  PieChart, 
  Info,
  ChevronRight
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ResultsNavigationProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  onRestart: () => void;
}

export function ResultsNavigation({
  activeTab,
  onTabChange,
  onRestart
}: ResultsNavigationProps) {
  
  const navItems = [
    { 
      id: 'visibility', 
      label: 'Visibility Score', 
      icon: PieChart,
      description: 'Overall brand presence'
    },
    { 
      id: 'matrix', 
      label: 'Comparison Matrix', 
      icon: BarChart2,
      description: 'Head-to-head analysis'
    },
    { 
      id: 'rankings', 
      label: 'Provider Rankings', 
      icon: Trophy,
      description: 'AI engine performance'
    },
    { 
      id: 'prompts', 
      label: 'Prompts & Responses', 
      icon: MessageSquare,
      description: 'Deep dive into answers'
    },
  ] as const;

  const glossaryContent: Record<string, { title: string; description: string }[]> = {
    visibility: [
      { title: 'Visibility Score', description: 'Percentage of AI responses where your brand is cited or mentioned.' },
      { title: 'Share of Voice', description: 'Your brand\'s dominance in the conversation compared to competitors.' },
    ],
    matrix: [
      { title: 'Market Avg', description: 'The average visibility score of all tracked competitors across all providers.' },
      { title: 'Your Score', description: 'Your brand\'s specific visibility score averaged across all providers.' },
      { title: 'Visual Mode', description: 'Interactive chart showing visibility trends and comparisons.' },
      { title: 'Table Mode', description: 'Detailed data grid with raw visibility percentages.' },
    ],
    rankings: [
      { title: 'Provider Ranking', description: 'How different AI engines (e.g., GPT-4, Claude) rank your brand.' },
      { title: 'Sentiment', description: 'The emotional tone of the AI\'s coverage (Positive, Neutral, Negative).' },
      { title: 'Average Position', description: 'Where your brand typically appears in lists (lower # is better).' },
    ],
    prompts: [
      { title: 'AI Response', description: 'The raw, generated answer from the AI model for a specific prompt.' },
      { title: 'Citations', description: 'Links or references the AI provided to support its answer.' },
    ]
  };

  const currentGlossary = glossaryContent[activeTab] || [];

  return (
    <nav className="w-64 flex-shrink-0 flex flex-col h-[calc(100vh-8rem)] sticky top-8 animate-fade-in-left">
      
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
          Analysis Report
        </h3>
        
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as ResultsTab)}
              className={`
                group relative flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-200'}
              `}
            >
              <div className={`
                p-2 rounded-lg transition-colors
                ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-500'}
              `}>
                <item.icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
                  {item.label}
                </p>
                <p className={`text-[11px] truncate ${isActive ? 'text-blue-500/80' : 'text-slate-400'}`}>
                  {item.description}
                </p>
              </div>

              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 px-1">
        <Accordion type="single" collapsible className="w-full" defaultValue="glossary">
          <AccordionItem value="glossary" className="border-slate-200">
            <AccordionTrigger className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-3">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                <span>Page Glossary</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-1 pb-4">
                {currentGlossary.map((term, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-xs font-semibold text-slate-900">{term.title}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {term.description}
                    </p>
                  </div>
                ))}
                
                {activeTab === 'visibility' && (
                  <div className="pt-2 border-t border-slate-100">
                     <p className="text-[10px] text-slate-400 font-mono">
                       Vis = (Citations / Total) * 100
                     </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </nav>
  );
}
