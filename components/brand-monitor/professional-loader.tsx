'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Circle, Sparkles } from 'lucide-react';

interface ProfessionalLoaderProps {
  title?: string;
  message?: string;
  stage?: 'scraping' | 'analyzing' | 'generating' | 'preparing';
}

export function ProfessionalLoader({
  title = 'Processing',
  message = 'Please wait while we process your request...',
  stage = 'scraping'
}: ProfessionalLoaderProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const stageMessages = {
    scraping: {
      title: 'Scraping Website',
      message: 'Collecting and analyzing your website data...',
      steps: ['Fetching content', 'Extracting information', 'Identifying competitors']
    },
    analyzing: {
      title: 'Analyzing Data',
      message: 'Processing your brand and competitor information...',
      steps: ['Analyzing brand', 'Comparing competitors', 'Generating insights']
    },
    generating: {
      title: 'Generating Prompts',
      message: 'Creating AI-powered analysis prompts...',
      steps: ['Preparing data', 'Generating prompts', 'Optimizing questions']
    },
    preparing: {
      title: 'Preparing Analysis',
      message: 'Getting everything ready for analysis...',
      steps: ['Loading data', 'Initializing providers', 'Preparing environment']
    }
  };

  const config = stageMessages[stage];

  // Reset step index when stage changes
  useEffect(() => {
    setActiveStepIndex(0);
  }, [stage]);

  // Simulate progress through steps
  useEffect(() => {
    if (activeStepIndex < config.steps.length - 1) {
      const timeout = setTimeout(() => {
        setActiveStepIndex(prev => prev + 1);
      }, 1500); // Advance every 1.5s to simulate work
      return () => clearTimeout(timeout);
    }
  }, [activeStepIndex, config.steps.length]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 h-full w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-8">
          
          {/* Header Section */}
          <div className="text-center space-y-4 mb-8">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
               {/* Animated rings */}
               <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
               <div className="absolute inset-2 border-2 border-dashed border-indigo-200 rounded-full animate-spin-reverse duration-[3s]"></div>
               
               {/* Center Icon */}
               <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
               </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{config.title}</h2>
              <p className="text-sm text-slate-500 font-medium">{config.message}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4 relative">
            {/* Connecting Line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 rounded-full -z-10" />

            {config.steps.map((step, index) => {
              const isCompleted = index < activeStepIndex;
              const isCurrent = index === activeStepIndex;
              const isPending = index > activeStepIndex;

              return (
                <div key={index} className="flex items-center gap-4 group">
                  <div className={`
                    relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 z-10 bg-white
                    ${isCompleted ? 'border-blue-500 bg-blue-50 text-blue-600 scale-100' : ''}
                    ${isCurrent ? 'border-blue-500 border-t-transparent animate-spin-slow' : ''}
                    ${isCurrent && !isCompleted ? 'border-blue-500' : ''}
                    ${isPending ? 'border-slate-200 text-slate-300' : ''}
                  `}>
                    {isCompleted && (
                      <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" />
                    )}
                    {isCurrent && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                    )}
                    {isPending && (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className={`
                      text-sm font-medium transition-colors duration-300
                      ${isCompleted ? 'text-slate-700' : ''}
                      ${isCurrent ? 'text-blue-700' : ''}
                      ${isPending ? 'text-slate-400' : ''}
                    `}>
                      {step}
                    </p>
                    {isCurrent && (
                       <p className="text-[10px] text-blue-500/80 font-medium animate-pulse mt-0.5 uppercase tracking-wide">
                         Processing...
                       </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer Tip */}
          <div className="mt-8 pt-6 text-center">
             <p className="text-xs text-slate-400">
               This may take up to a minute depending on the website size.
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}
