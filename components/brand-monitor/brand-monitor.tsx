'use client';

import React, { useReducer, useCallback, useState, useEffect, useRef } from 'react';
import { Company } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, LayoutList, LineChart } from 'lucide-react';
import { CREDITS_PER_BRAND_ANALYSIS } from '@/config/constants';
import { ClientApiError } from '@/lib/client-errors';
import { 
  brandMonitorReducer, 
  initialBrandMonitorState,
  BrandMonitorAction,
  IdentifiedCompetitor
} from '@/lib/brand-monitor-reducer';
import {
  validateUrl,
  validateCompetitorUrl,
  normalizeCompetitorName,
  assignUrlToCompetitor,
  detectServiceType,
  getIndustryCompetitors,
  isValidUrlFormat
} from '@/lib/brand-monitor-utils';
import { getEnabledProviders } from '@/lib/provider-config';
import { useSaveBrandAnalysis } from '@/hooks/useBrandAnalyses';

// Components
import { UrlInputSection } from './url-input-section';
import { CompanyCard } from './company-card';
import { CompetitorSelectionScreen } from './competitor-selection-screen';
import { PersonaSelectionScreen } from './persona-selection-screen';
import { ScrapingLoader } from './scraping-loader';
import { ProfessionalLoader } from './professional-loader';
import { AnalysisProgressSection } from './analysis-progress-section';
import { ResultsNavigation } from './results-navigation';
import { PromptsResponsesTab } from './prompts-responses-tab';
import { VisibilityScoreTab } from './visibility-score-tab';
import { ErrorMessage } from './error-message';
import { AddPromptModal } from './modals/add-prompt-modal';
import { AddCompetitorModal } from './modals/add-competitor-modal';
import { ProviderComparisonMatrix } from './provider-comparison-matrix';
import { ProviderRankingsTabs } from './provider-rankings-tabs';

// Hooks
import { useSSEHandler } from './hooks/use-sse-handler';

interface BrandMonitorProps {
  creditsAvailable?: number;
  onCreditsUpdate?: () => void;
  selectedAnalysis?: any;
  onSaveAnalysis?: (analysis: any) => void;
  initialUrl?: string | null;
  lockUrl?: boolean;
  autoRun?: boolean;
  onRequireCreditsConfirm?: (required: number, balance: number, proceed: () => void) => void;
}

export function BrandMonitor({ 
  creditsAvailable = 0, 
  onCreditsUpdate,
  selectedAnalysis,
  onSaveAnalysis,
  initialUrl = null,
  lockUrl = false,
  autoRun = false,
  onRequireCreditsConfirm,
}: BrandMonitorProps = {}) {
  const [state, dispatch] = useReducer(brandMonitorReducer, {
    ...initialBrandMonitorState,
    showInput: !initialUrl || !autoRun,
    loading: !!initialUrl && autoRun,
    url: initialUrl || '',
    urlValid: !!initialUrl,
  });
  const [demoUrl] = useState('example.com');
  const saveAnalysis = useSaveBrandAnalysis();
  const [isLoadingExistingAnalysis, setIsLoadingExistingAnalysis] = useState(false);
  const hasSavedRef = useRef(false);
  const hasStartedAutoScrape = useRef(false);
  const [matrixViewMode, setMatrixViewMode] = useState<'chart' | 'table'>('chart');
  
  const { startSSEConnection } = useSSEHandler({ 
    state, 
    dispatch, 
    onCreditsUpdate,
    onAnalysisComplete: (completedAnalysis) => {
      console.log('[DEBUG] Analysis completed, checking if should save...');
      console.log('[DEBUG] selectedAnalysis:', selectedAnalysis);
      console.log('[DEBUG] hasSavedRef.current:', hasSavedRef.current);
      console.log('[DEBUG] completedAnalysis:', completedAnalysis);
      
      // Only save if this is a new analysis (not loaded from existing)
      if (!selectedAnalysis && !hasSavedRef.current) {
        hasSavedRef.current = true;
        
        const analysisData = {
          url: company?.url || url,
          companyName: company?.name,
          industry: company?.industry,
          analysisData: completedAnalysis,
          competitors: identifiedCompetitors,
          prompts: analyzingPrompts,
          creditsUsed: CREDITS_PER_BRAND_ANALYSIS
        };
        
        console.log('[DEBUG] Saving analysis data:', analysisData);
        
        saveAnalysis.mutate(analysisData, {
          onSuccess: (savedAnalysis) => {
            console.log('[SUCCESS] Analysis saved successfully:', savedAnalysis);
            if (onSaveAnalysis) {
              onSaveAnalysis(savedAnalysis);
            }
          },
          onError: (error) => {
            console.error('[ERROR] Failed to save analysis:', error);
            hasSavedRef.current = false;
          }
        });
      } else {
        console.log('[DEBUG] Skipping save - either selectedAnalysis exists or already saved');
      }
    }
  });
  
  // Extract state for easier access
  const {
    url,
    urlValid,
    error,
    loading,
    analyzing,
    preparingAnalysis,
    company,
    showInput,
    showCompanyCard,
    showCompetitorsScreen,
    showPersonaScreen,
    showPromptsList,
    showCompetitors,
    customPrompts,
    analyzingPrompts,
    personas,
    identifiedCompetitors,
    availableProviders,
    analysisProgress,
    promptCompletionStatus,
    analysis,
    activeResultsTab,
    expandedPromptIndex,
    showAddPromptModal,
    showAddCompetitorModal,
    newPromptText,
    newCompetitorName,
    newCompetitorUrl,
    scrapingCompetitors
  } = state;
  
  // Remove the auto-save effect entirely - we'll save manually when analysis completes
  
  // Load selected analysis if provided or reset when null
  useEffect(() => {
    if (selectedAnalysis && selectedAnalysis.analysisData) {
      setIsLoadingExistingAnalysis(true);
      // Restore the analysis state from saved data
      dispatch({ type: 'SET_ANALYSIS', payload: selectedAnalysis.analysisData });
      if (selectedAnalysis.companyName) {
        dispatch({ type: 'SCRAPE_SUCCESS', payload: {
          name: selectedAnalysis.companyName,
          url: selectedAnalysis.url,
          industry: selectedAnalysis.industry
        } as Company });
      }
      // Reset the flag after a short delay to ensure the save effect doesn't trigger
      setTimeout(() => setIsLoadingExistingAnalysis(false), 100);
    } else if (selectedAnalysis === null) {
      // Reset state when explicitly set to null (New Analysis clicked)
      dispatch({ type: 'RESET_STATE' });
      hasSavedRef.current = false;
      setIsLoadingExistingAnalysis(false);
      hasStartedAutoScrape.current = false; // Reset auto-scrape guard
    }
  }, [selectedAnalysis]);
  
  // Handlers
  const handleUrlChange = useCallback(async (newUrl: string) => {
    dispatch({ type: 'SET_URL', payload: newUrl });
    
    // Clear any existing error when user starts typing
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: null });
    }
    
    // Validate URL on change
    if (newUrl.length > 0) {
      const isValid = isValidUrlFormat(newUrl);
      dispatch({ type: 'SET_URL_VALID', payload: isValid });
    } else {
      dispatch({ type: 'SET_URL_VALID', payload: null });
    }
  }, [error]);

  const handlePrepareAnalysis = useCallback(async (companyOverride?: Company) => {
    const targetCompany = companyOverride || company;
    if (!targetCompany) return;
    
    dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: true });
    
    // Check which providers are available
    try {
      const response = await fetch('/api/brand-monitor/check-providers', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_AVAILABLE_PROVIDERS', payload: data.providers || ['OpenAI', 'Anthropic', 'Google'] });
      }
    } catch (e) {
      // Default to providers with API keys if check fails
      const defaultProviders = [];
      if (process.env.NEXT_PUBLIC_HAS_OPENAI_KEY) defaultProviders.push('OpenAI');
      if (process.env.NEXT_PUBLIC_HAS_ANTHROPIC_KEY) defaultProviders.push('Anthropic');
      dispatch({ type: 'SET_AVAILABLE_PROVIDERS', payload: defaultProviders.length > 0 ? defaultProviders : ['OpenAI', 'Anthropic'] });
    }
    
    // Extract competitors from scraped data or use industry defaults
    const extractedCompetitors = targetCompany.scrapedData?.competitors || [];
    
    // Merge extracted competitors with industry defaults, keeping URLs where available
    const competitorMap = new Map<string, IdentifiedCompetitor>();
    
    // Add extracted competitors and try to match them with known URLs
    extractedCompetitors.forEach((name: string) => {
      const normalizedName = normalizeCompetitorName(name);
      
      // Check if we already have this competitor
      const existing = competitorMap.get(normalizedName);
      if (existing) {
        // If existing has URL but current doesn't, keep existing
        if (!existing.url) {
          const url = assignUrlToCompetitor(name);
          competitorMap.set(normalizedName, { name, url });
        }
        return;
      }
      
      // New competitor - try to find a URL for it
      const url = assignUrlToCompetitor(name);
      competitorMap.set(normalizedName, { name, url });
    });
    
    const getFaviconDomain = (url?: string) => {
      if (!url) return undefined;
      const [domain] = url.split('/');
      return domain;
    };

    let competitors = Array.from(competitorMap.values())
      .filter(comp => comp.name !== 'Competitor 1' && comp.name !== 'Competitor 2' && 
                      comp.name !== 'Competitor 3' && comp.name !== 'Competitor 4' && 
                      comp.name !== 'Competitor 5')
      .slice(0, 10)
      .map(comp => {
        const fallbackUrl = comp.url || assignUrlToCompetitor(comp.name);
        const validatedUrl = fallbackUrl ? validateCompetitorUrl(fallbackUrl) : undefined;
        const faviconDomain = getFaviconDomain(validatedUrl);

        return {
          ...comp,
          url: validatedUrl,
          metadata: faviconDomain ? {
            ...comp.metadata,
            favicon: `https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`,
            validated: true,
          } : comp.metadata,
        };
      });

    // Just use the first 6 competitors without AI validation
    competitors = competitors.slice(0, 6);

    console.log('Identified competitors:', competitors);
    dispatch({ type: 'SET_IDENTIFIED_COMPETITORS', payload: competitors });

    // If called from initial URL (brand monitor creation), show competitors screen directly
    // Otherwise show competitors inline on company card
    if (initialUrl) {
      dispatch({ type: 'SET_SHOW_COMPETITORS_SCREEN', payload: true });
    } else {
      dispatch({ type: 'SET_SHOW_COMPETITORS', payload: true });
    }
    dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: false });
  }, [company, initialUrl]);
  
  const handleScrape = useCallback(async () => {
    if (!url) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a URL' });
      return;
    }

    // Validate URL format first
    if (!isValidUrlFormat(url)) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a valid URL format (e.g., example.com or https://example.com)' });
      dispatch({ type: 'SET_URL_VALID', payload: false });
      return;
    }

    // Check if user has enough credits for initial scrape (1 credit)
    if (creditsAvailable < 1) {
      dispatch({ type: 'SET_ERROR', payload: 'Insufficient credits. You need at least 1 credit to analyze a URL.' });
      return;
    }

    console.log('Starting scrape for URL:', url);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_SHOW_INPUT', payload: false });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_URL_VALID', payload: true });
    
    try {
      const response = await fetch('/api/brand-monitor/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url,
          maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week in milliseconds
        }),
      });

      console.log('Scrape response status:', response.status);

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Scrape API error:', errorData);
          if (errorData.error?.message) {
            throw new ClientApiError(errorData);
          }
          throw new Error(errorData.error || 'Failed to scrape');
        } catch (e) {
          if (e instanceof ClientApiError) throw e;
          throw new Error('Failed to scrape');
        }
      }

      const data = await response.json();
      console.log('Scrape data received:', data);

      if (!data.company) {
        throw new Error('No company data received');
      }

      // DO NOT prefill prompts here anymore - they will be generated after competitor selection
      // Prompts will be generated when user continues from the competitor selection screen
      
      // Scrape was successful - credits have been deducted, refresh the navbar
      if (onCreditsUpdate) {
        onCreditsUpdate();
      }
      
      // After fade out completes, set company
      dispatch({ type: 'SCRAPE_SUCCESS', payload: data.company });

      // If initialUrl is present (Create New flow), automatically proceed to competitor analysis
      if (initialUrl) {
         await handlePrepareAnalysis(data.company);
      } else {
         // Standard flow: Show company card
         dispatch({ type: 'SET_SHOW_COMPANY_CARD', payload: true });
         console.log('Showing company card');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to extract company information';
      if (error instanceof ClientApiError) {
        errorMessage = error.getUserMessage();
      } else if (error.message) {
        errorMessage = `Failed to extract company information: ${error.message}`;
      }
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_SHOW_INPUT', payload: true });
      console.error('HandleScrape error:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [url, creditsAvailable, onCreditsUpdate, initialUrl, handlePrepareAnalysis]);

  // Handle initialUrl - when provided, sync state and optionally auto-scrape
  useEffect(() => {
    // Always sync URL state with prop if they differ
    if (initialUrl && url !== initialUrl) {
      dispatch({ type: 'SET_URL', payload: initialUrl });
      const isValid = isValidUrlFormat(initialUrl);
      dispatch({ type: 'SET_URL_VALID', payload: isValid });
    }

    const run = async () => {
      if (!autoRun) return;

      try {
        if (!initialUrl) return;

        // Use ref to ensure we only run the auto-scrape once
        if (hasStartedAutoScrape.current) return;
        
        // Also check if we already have data (in case of hot reload or re-mount with state preserved)
        // But since we initialized loading=true if initialUrl exists, we can't check 'loading' here.
        if (analysis || company || analyzing || preparingAnalysis) return;

        hasStartedAutoScrape.current = true;

        // Check credits before scraping
        if (creditsAvailable < 1) {
          dispatch({ type: 'SET_ERROR', payload: 'Insufficient credits. You need at least 1 credit to analyze a URL.' });
          dispatch({ type: 'SET_LOADING', payload: false }); // Stop loading if error
          return;
        }

        console.log('Starting auto-scrape for URL:', initialUrl);
        // Note: loading is already true from initial state
        dispatch({ type: 'SET_ERROR', payload: null });

        // Auto-start scraping when initialUrl is provided
        const response = await fetch('/api/brand-monitor/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: initialUrl,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week in milliseconds
          }),
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            console.error('Scrape API error:', errorData);
            throw new Error(errorData.error || 'Failed to scrape');
          } catch (e) {
            throw new Error('Failed to scrape website');
          }
        }

        const data = await response.json();
        console.log('Scrape data received:', data);

        if (!data.company) {
          throw new Error('No company data received');
        }

        // Update credits
        if (onCreditsUpdate) {
          onCreditsUpdate();
        }

        dispatch({ type: 'SCRAPE_SUCCESS', payload: data.company });

        // Prepare analysis (identify competitors)
        await handlePrepareAnalysis(data.company);

      } catch (e) {
        console.error('[InitialUrl] pipeline error', e);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load website data. Please try again.' });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: false });
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, creditsAvailable, onCreditsUpdate, autoRun]); // Added autoRun to deps
  

  
  const handleProceedToPrompts = useCallback(async () => {
    if (!company) return;
    // Transition to the competitor selection screen
    const currentView = document.querySelector('.animate-panel-in');
    if (currentView) {
      currentView.classList.add('opacity-0');
    }

    setTimeout(() => {
      dispatch({ type: 'SET_SHOW_COMPANY_CARD', payload: false });
      dispatch({ type: 'SET_SHOW_COMPETITORS_SCREEN', payload: true });
    }, 300);
  }, [company]);

  // Handler: Generate PERSONAS based on final competitors and show persona screen
  const handleProceedToPersonas = useCallback(async () => {
    if (!company) return;

    dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: true });

    try {
      const response = await fetch('/api/brand-monitor/generate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company })
      });

      if (!response.ok) {
        throw new Error('Failed to generate personas');
      }

      const data = await response.json();

      if (Array.isArray(data.personas)) {
        dispatch({ type: 'SET_PERSONAS', payload: data.personas });
      }

      // Transition to personas view
      const currentView = document.querySelector('.animate-panel-in');
      if (currentView) {
        currentView.classList.add('opacity-0');
      }

      setTimeout(() => {
        dispatch({ type: 'SET_SHOW_COMPETITORS_SCREEN', payload: false });
        dispatch({ type: 'SET_SHOW_PERSONA_SCREEN', payload: true });
        dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: false });
      }, 300);
    } catch (error) {
      console.error('Error generating personas:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to generate personas. Please try again.' });
      dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: false });
    }
  }, [company]);

  // Handler: Generate PROMPTS based on personas and show prompts screen
  const handleGeneratePromptsFromPersonas = useCallback(async () => {
    if (!company) return;

    dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: true });

    try {
      const competitorNames = identifiedCompetitors.map(c => c.name);

      const response = await fetch('/api/brand-monitor/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          competitors: competitorNames,
          personas: state.personas
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate prompts');
      }

      const data = await response.json();

      if (Array.isArray(data.prompts) && data.prompts.length > 0) {
        dispatch({ type: 'SET_ANALYZING_PROMPTS', payload: data.prompts });
      }

      if (onCreditsUpdate) {
        onCreditsUpdate();
      }

      // Transition to prompts view
      const currentView = document.querySelector('.animate-panel-in');
      if (currentView) {
        currentView.classList.add('opacity-0');
      }

      setTimeout(() => {
        dispatch({ type: 'SET_SHOW_PERSONA_SCREEN', payload: false });
        dispatch({ type: 'SET_SHOW_PROMPTS_LIST', payload: true });
        dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: false });
      }, 300);
    } catch (error) {
      console.error('Error generating prompts:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to generate prompts. Please try again.' });
      dispatch({ type: 'SET_PREPARING_ANALYSIS', payload: false });
    }
  }, [company, identifiedCompetitors, state.personas, onCreditsUpdate]);

  // Handler for going back from prompts to personas
  const handleBackToPersonas = useCallback(async () => {
    // Fade out current view
    const currentView = document.querySelector('.animate-panel-in');
    if (currentView) {
      currentView.classList.add('opacity-0');
    }

    setTimeout(() => {
      dispatch({ type: 'SET_SHOW_PROMPTS_LIST', payload: false });
      dispatch({ type: 'SET_SHOW_PERSONA_SCREEN', payload: true });
    }, 300);
  }, []);

  // Handler for going back from personas to competitors
  const handleBackToCompetitors = useCallback(async () => {
    // Fade out current view
    const currentView = document.querySelector('.animate-panel-in');
    if (currentView) {
      currentView.classList.add('opacity-0');
    }

    setTimeout(() => {
      dispatch({ type: 'SET_SHOW_PERSONA_SCREEN', payload: false });
      dispatch({ type: 'SET_SHOW_COMPETITORS_SCREEN', payload: true });
    }, 300);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!company) return;

    // Reset saved flag for new analysis
    hasSavedRef.current = false;

    // Check if user has enough credits
    if (creditsAvailable < CREDITS_PER_BRAND_ANALYSIS) {
      dispatch({ type: 'SET_ERROR', payload: `Insufficient credits. You need at least ${CREDITS_PER_BRAND_ANALYSIS} credits to run an analysis.` });
      return;
    }

    // Immediately trigger credit update to reflect deduction in navbar
    if (onCreditsUpdate) {
      onCreditsUpdate();
    }

    // Collect prompts from backend-generated (analyzingPrompts) and user custom prompts
    // We removed hardcoded defaults; ensure we merge backend-provided prompts with custom ones.

      const backendPrompts = analyzingPrompts || [];
      const userPrompts = customPrompts.map((p, idx) => ({
          id: `custom-${Date.now()}-${idx}`,
          prompt: p.trim(),
          category: 'custom' as const,
          source: 'user' as const
      })).filter(p => p.prompt && !backendPrompts.some(bp => bp.prompt === p.prompt));
      
      const mergedPrompts = [...backendPrompts, ...userPrompts];

    // CRITICAL: Update state IMMEDIATELY so prompts list shows all prompts
      dispatch({ type: 'SET_ANALYZING_PROMPTS', payload: mergedPrompts });

      console.log('🔍 Analysis Prompts Debug:', {
          backendPrompts: backendPrompts.length,
          customPrompts: userPrompts.length,
          mergedTotal: mergedPrompts.length,
          allPrompts: mergedPrompts
      });


      console.log('Starting analysis...');
    
    dispatch({ type: 'SET_ANALYZING', payload: true });
    dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: {
      stage: 'initializing',
      progress: 0,
      message: 'Starting analysis...',
      competitors: [],
      prompts: [],
      partialResults: []
    }});
    dispatch({ type: 'SET_ANALYSIS_TILES', payload: [] });
    
    // Initialize prompt completion status using merged prompts
    const initialStatus: any = {};
    const expectedProviders = getEnabledProviders().map(config => config.name);

    mergedPrompts.forEach(p => {
      initialStatus[p.prompt] = {};
      expectedProviders.forEach(provider => {
        initialStatus[p.prompt][provider] = 'pending';
      });
    });
    dispatch({ type: 'SET_PROMPT_COMPLETION_STATUS', payload: initialStatus });


      // Build payload and use relative path to avoid cross-origin issues
        try {
            // Build payload and use relative path to avoid cross-origin issues
            const analyzeUrl = '/api/brand-monitor/analyze';

            const payload: any = {
                company,
                competitors: identifiedCompetitors,
                prompts: mergedPrompts, // Always send merged prompts (backend + custom)
            };

            console.debug('[ANALYZE] Posting to', analyzeUrl, 'payload:', payload);

      await startSSEConnection(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } finally {
      dispatch({ type: 'SET_ANALYZING', payload: false });
    }
  }, [company, customPrompts, identifiedCompetitors, startSSEConnection, creditsAvailable, analyzingPrompts]);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    hasSavedRef.current = false;
    setIsLoadingExistingAnalysis(false);
  }, []);

  // Reconcile backend analysis competitor keys with user-added competitors (name-only allowed)
  useEffect(() => {
    if (!state.analysis) return;

    const analysis = state.analysis as any;
    const customs = (state.identifiedCompetitors || []).map(c => ({
      name: (c.name || '').trim(),
      normName: (c.name || '').toLowerCase().trim(),
      domain: c.url ? c.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase() : undefined,
    }));

    const matchToCustom = (label: string): string | null => {
      const norm = (label || '').toLowerCase().trim();
      // try exact norm name match first
      const byName = customs.find(c => c.normName && c.normName === norm);
      if (byName) return byName.name;
      // also try domain containment if label looks like a domain
      const labelDomain = norm.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
      const byDomain = customs.find(c => c.domain && (c.domain === labelDomain || labelDomain.includes(c.domain) || c.domain.includes(labelDomain)));
      return byDomain ? byDomain.name : null;
    };

    let changed = false;
    const newAnalysis = { ...analysis };

    // 1) Re-label providerComparison rows to custom names when match found
    if (Array.isArray(newAnalysis.providerComparison)) {
      newAnalysis.providerComparison = newAnalysis.providerComparison.map((row: any) => {
        const matched = matchToCustom(row.competitor);
        if (matched && matched !== row.competitor) {
          changed = true;
          return { ...row, competitor: matched };
        }
        return row;
      });
    }

    // 2) Re-label competitors array entries
    if (Array.isArray(newAnalysis.competitors)) {
      newAnalysis.competitors = newAnalysis.competitors.map((comp: any) => {
        const matched = matchToCustom(comp.name || comp.competitor || '');
        if (matched && matched !== (comp.name || comp.competitor)) {
          changed = true;
          return { ...comp, name: matched, competitor: matched };
        }
        return comp;
      });
    }

    // 3) Merge duplicates that may result from relabeling
    if (Array.isArray(newAnalysis.competitors)) {
      const merged: any = {};
      for (const comp of newAnalysis.competitors) {
        const key = (comp.name || comp.competitor || '').toLowerCase();
        if (!merged[key]) merged[key] = { ...comp };
        else {
          // sum mentions, average positions weighted by mentions where possible
          merged[key].mentions = (merged[key].mentions || 0) + (comp.mentions || 0);
          const aM = merged[key].mentions || 0;
          const bM = comp.mentions || 0;
          if (aM + bM > 0) {
            const aPos = merged[key].averagePosition || 0;
            const bPos = comp.averagePosition || 0;
            merged[key].averagePosition = ((aPos * aM) + (bPos * bM)) / (aM + bM);
          }
          // keep sentiment score as max for visibility context
          merged[key].sentimentScore = Math.max(merged[key].sentimentScore || 0, comp.sentimentScore || 0);
        }
      }

      // Recalculate visibility scores as share of voice (normalized to 100%)
      const mergedArray = Object.values(merged);
      const totalMentions = mergedArray.reduce((sum: number, comp: any) => sum + (comp.mentions || 0), 0);
      if (totalMentions > 0) {
        mergedArray.forEach((comp: any) => {
          comp.visibilityScore = Math.round((comp.mentions / totalMentions) * 1000) / 10;
        });
      }

      newAnalysis.competitors = mergedArray;
    }

    if (changed) {
      dispatch({ type: 'SET_ANALYSIS', payload: newAnalysis });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.analysis]);
  
  // Debug function to manually save analysis
  const handleManualSave = useCallback(() => {
    if (!analysis || !company) {
      console.log('[DEBUG] No analysis or company data to save');
      return;
    }
    
    const analysisData = {
      url: company?.url || url,
      companyName: company?.name,
      industry: company?.industry,
      analysisData: analysis,
      competitors: identifiedCompetitors,
      prompts: analyzingPrompts,
      creditsUsed: CREDITS_PER_BRAND_ANALYSIS
    };
    
    console.log('[DEBUG] Manual save triggered with data:', analysisData);
    
    saveAnalysis.mutate(analysisData, {
      onSuccess: (savedAnalysis) => {
        console.log('[SUCCESS] Manual save successful:', savedAnalysis);
      },
      onError: (error) => {
        console.error('[ERROR] Manual save failed:', error);
      }
    });
  }, [analysis, company, url, identifiedCompetitors, analyzingPrompts, saveAnalysis]);
  
  const batchScrapeAndValidateCompetitors = useCallback(async (competitors: IdentifiedCompetitor[]) => {
    const validatedCompetitors = competitors.map(comp => ({
      ...comp,
      url: comp.url ? validateCompetitorUrl(comp.url) : undefined
    })).filter(comp => comp.url);
    
    if (validatedCompetitors.length === 0) return;
    
    // Implementation for batch scraping - you can move the full implementation here
    // For now, just logging
    console.log('Batch scraping validated competitors:', validatedCompetitors);
  }, []);
  
  
  // Find brand data
  const brandData = analysis?.competitors?.find(c => c.isOwn);
  
  return (
    <div className="flex flex-col h-full min-h-[600px]">

      {/* URL Input Section */}
      {showInput && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full min-h-0">
            <UrlInputSection
            url={url}
            urlValid={urlValid}
            loading={loading}
            analyzing={analyzing}
            locked={lockUrl}
            onUrlChange={handleUrlChange}
            onSubmit={handleScrape}
          />
          </div>
        </div>
      )}

      {/* Unified Professional Loader */}
      {((!showInput && loading && !company) || (company && !showCompanyCard && !showCompetitorsScreen && !state.showPersonaScreen && preparingAnalysis)) && (
        <ProfessionalLoader
          stage="scraping"
          title="Analyzing Website"
          message="We're collecting data and identifying competitors..."
        />
      )}

      {/* Company Card Section with Competitors */}
      {!showInput && company && !showCompetitorsScreen && !state.showPersonaScreen && !showPromptsList && !analyzing && !analysis && (
        <div className="flex-1 flex items-center justify-center animate-panel-in min-h-0 h-full">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full min-h-0">
            <div className="w-full space-y-6 h-full min-h-0">
            <div className={`transition-all duration-500 ${showCompanyCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <CompanyCard
                company={company}
                onAnalyze={handlePrepareAnalysis}
                analyzing={preparingAnalysis}
                showCompetitors={showCompetitors}
                identifiedCompetitors={identifiedCompetitors}
                onRemoveCompetitor={(idx) => dispatch({ type: 'REMOVE_COMPETITOR', payload: idx })}
                onAddCompetitor={() => {
                  dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addCompetitor', show: true } });
                  dispatch({ type: 'SET_NEW_COMPETITOR', payload: { name: '', url: '' } });
                }}
                onContinueToAnalysis={handleProceedToPrompts}
              />
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Competitor Selection Screen */}
      {showCompetitorsScreen && company && !state.showPersonaScreen && !showPromptsList && !analyzing && !analysis && (
        <CompetitorSelectionScreen
          company={company}
          identifiedCompetitors={identifiedCompetitors}
          onRemoveCompetitor={(idx) => dispatch({ type: 'REMOVE_COMPETITOR', payload: idx })}
          onAddCompetitor={() => {
            dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addCompetitor', show: true } });
            dispatch({ type: 'SET_NEW_COMPETITOR', payload: { name: '', url: '' } });
          }}
          onContinueToNextStep={handleProceedToPersonas}
          isLoading={preparingAnalysis}
        />
      )}

      {/* Persona Selection Screen */}
      {state.showPersonaScreen && company && !showPromptsList && !analyzing && !analysis && (
        <div className="flex-1 min-h-0 h-full">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full min-h-0">
            <PersonaSelectionScreen
              personas={state.personas}
              onAddPersona={(persona) => dispatch({ type: 'ADD_PERSONA', payload: persona })}
              onRemovePersona={(id) => dispatch({ type: 'REMOVE_PERSONA', payload: id })}
              onContinue={handleGeneratePromptsFromPersonas}
              onBack={handleBackToCompetitors}
              isLoading={preparingAnalysis}
            />
          </div>
        </div>
      )}

      {/* Prompts List Section */}
      {showPromptsList && company && !analysis && (
        <div className="flex-1 min-h-0 h-full">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full min-h-0">
            <AnalysisProgressSection
                company={company}
                analyzing={analyzing}
                identifiedCompetitors={identifiedCompetitors}
                scrapingCompetitors={scrapingCompetitors}
                analysisProgress={analysisProgress}
                prompts={analyzingPrompts}
                customPrompts={customPrompts}
                promptCompletionStatus={promptCompletionStatus}
                onRemoveCustomPrompt={(prompt) => {
                    // Remove from customPrompts (if it's there)
                    const updatedCustomPrompts = customPrompts.filter(p => p !== prompt);
                    dispatch({ type: 'SET_CUSTOM_PROMPTS', payload: updatedCustomPrompts });

                    // Remove from analyzingPrompts (works for both custom and pre-generated)
                    const updatedAnalyzingPrompts = analyzingPrompts.filter(p => p.prompt !== prompt);
                    dispatch({ type: 'SET_ANALYZING_PROMPTS', payload: updatedAnalyzingPrompts });

                    console.log('✅ Prompt removed:', prompt);
                }}

                onAddPromptClick={() => {
                    dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addPrompt', show: true } });
                    dispatch({ type: 'SET_NEW_PROMPT_TEXT', payload: '' });
                }}
                onAddCompetitorClick={() => {
                  dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addCompetitor', show: true } });
                  dispatch({ type: 'SET_NEW_COMPETITOR', payload: { name: '', url: '' } });
                }}
                onStartAnalysis={handleAnalyze}
                onBack={handleBackToPersonas}
            />
            </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && brandData && (
        <div className="flex-1 flex justify-center animate-panel-in pt-8 min-h-0 h-full">
          <div className="w-[95%] max-w-none mx-auto px-4 sm:px-6 lg:px-8 h-full min-h-0">
            <div className="flex gap-6 relative h-full min-h-0">
            {/* Sidebar Navigation */}
            <div className="space-y-4">
              <ResultsNavigation
                activeTab={activeResultsTab}
                onTabChange={(tab) => {
                  dispatch({ type: 'SET_ACTIVE_RESULTS_TAB', payload: tab });
                }}
                onRestart={handleRestart}
              />
              
              {/* Debug Save Button - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">Debug Tools:</p>
                  <button
                    onClick={handleManualSave}
                    className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                    disabled={saveAnalysis.isPending}
                  >
                    {saveAnalysis.isPending ? 'Saving...' : 'Manual Save'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-h-0">
              <div className="w-full flex-1 flex flex-col h-full min-h-0">
                {/* Tab Content */}
                {activeResultsTab === 'visibility' && (
                  <VisibilityScoreTab
                    competitors={analysis.competitors}
                    brandData={brandData}
                    identifiedCompetitors={identifiedCompetitors}
                    company={company}
                  />
                )}

                {activeResultsTab === 'matrix' && (() => {
                  const matrixData = analysis.providerComparison || [];
                  const marketTotal = matrixData.reduce((acc: number, item: any) => {
                    const scores = Object.values(item.providers).map((p: any) => p?.visibilityScore || 0);
                    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
                    return acc + avg;
                  }, 0);
                  const marketAvg = matrixData.length > 0 ? Math.round(marketTotal / matrixData.length) : 0;

                  return (
                  <div className="w-full flex justify-center">
                    <Card className="bg-white text-card-foreground border border-gray-200 rounded-xl shadow-sm w-[95%] mx-auto flex flex-col h-[calc(100vh-120px)]">
                      <CardHeader className="border-b p-6 flex-shrink-0">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-xl font-semibold">Comparison Matrix</CardTitle>
                            <CardDescription className="text-sm text-gray-600 mt-1">
                              Compare visibility scores across different AI providers
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <button
                                    onClick={() => setMatrixViewMode('chart')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        matrixViewMode === 'chart' 
                                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                                    }`}
                                >
                                    <LineChart className="w-4 h-4" />
                                    <span>Visual</span>
                                </button>
                                <button
                                    onClick={() => setMatrixViewMode('table')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        matrixViewMode === 'table' 
                                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                                    }`}
                                >
                                    <LayoutList className="w-4 h-4" />
                                    <span>Table</span>
                                </button>
                            </div>
                            <div className="flex gap-6 border-l border-slate-200 pl-6">
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-700">{marketAvg}%</p>
                                    <p className="text-xs text-gray-500 mt-1">Market Avg</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-[#155DFC]">{brandData.visibilityScore}%</p>
                                    <p className="text-xs text-gray-500 mt-1">Your Score</p>
                                </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className={`pt-6 flex-1 ${matrixViewMode === 'chart' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
                        {analysis.providerComparison ? (
                          <ProviderComparisonMatrix
                            data={analysis.providerComparison}
                            brandName={company?.name || ''}
                            company={company}
                            competitors={identifiedCompetitors}
                            viewMode={matrixViewMode}
                          />
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>No comparison data available</p>
                            <p className="text-sm mt-2">
                              Please ensure AI providers are configured and the analysis has completed.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  );
                })()}

                {activeResultsTab === 'rankings' && analysis.providerRankings && (
                  <div id="provider-rankings">
                    <ProviderRankingsTabs 
                      providerRankings={analysis.providerRankings} 
                      brandName={company?.name || 'Your Brand'}
                      shareOfVoice={brandData.shareOfVoice}
                      averagePosition={Math.round(brandData.averagePosition)}
                      sentimentScore={brandData.sentimentScore}
                      weeklyChange={brandData.weeklyChange}
                      identifiedCompetitors={identifiedCompetitors}
                      company={company}
                    />
                  </div>
                )}

                {activeResultsTab === 'prompts' && analysis.prompts && (
                  <Card className="p-2 bg-card text-card-foreground gap-6 rounded-xl border py-6 shadow-sm border-gray-200 flex flex-col h-full">
                    <CardHeader className="border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl font-semibold">Prompts & Responses</CardTitle>
                          <CardDescription className="text-sm text-gray-600 mt-1">
                            AI responses to your brand queries
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#155DFC]">{analysis.prompts.length}</p>
                          <p className="text-xs text-gray-500 mt-1">Total Prompts</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 overflow-auto">
                      <PromptsResponsesTab
                        prompts={analysis.prompts}
                        responses={analysis.responses}
                        expandedPromptIndex={expandedPromptIndex}
                        onToggleExpand={(index) => dispatch({ type: 'SET_EXPANDED_PROMPT_INDEX', payload: index })}
                        brandName={analysis.company?.name || ''}
                        competitors={analysis.competitors?.map(c => c.name) || []}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <ErrorMessage
          error={error}
          onDismiss={() => dispatch({ type: 'SET_ERROR', payload: null })}
        />
      )}
      
      {/* Modals */}
        <AddPromptModal
            isOpen={showAddPromptModal}
            promptText={newPromptText}
            onPromptTextChange={(text) => dispatch({ type: 'SET_NEW_PROMPT_TEXT', payload: text })}
                            onAdd={() => {
                                if (newPromptText.trim()) {
                                    const newPromptTextTrimmed = newPromptText.trim();
            
                                    // Add to custom prompts list (strings)
                                    dispatch({ type: 'ADD_CUSTOM_PROMPT', payload: newPromptTextTrimmed });
            
                                    // Create a proper BrandPrompt object
                                    const newPromptObject: BrandPrompt = {
                                        id: `custom-${Date.now()}`,
                                        prompt: newPromptTextTrimmed,
                                        category: 'recommendations',
                                        source: 'user'
                                    };

                                    // IMMEDIATELY merge into analyzingPrompts so it shows up in the list
                                    const updatedAnalyzingPrompts = [...analyzingPrompts, newPromptObject];
                                    dispatch({ type: 'SET_ANALYZING_PROMPTS', payload: updatedAnalyzingPrompts });
            
                                    // Close modal and reset
                                    dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addPrompt', show: false } });
                                    dispatch({ type: 'SET_NEW_PROMPT_TEXT', payload: '' });
            
                                    console.log('✅ Custom prompt added:', newPromptObject);
                                }
                            }}            onClose={() => {
                dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addPrompt', show: false } });
                dispatch({ type: 'SET_NEW_PROMPT_TEXT', payload: '' });
            }}
        />



        <AddCompetitorModal
        isOpen={showAddCompetitorModal}
        competitorName={newCompetitorName}
        competitorUrl={newCompetitorUrl}
        onNameChange={(name) => dispatch({ type: 'SET_NEW_COMPETITOR', payload: { name } })}
        onUrlChange={(url) => dispatch({ type: 'SET_NEW_COMPETITOR', payload: { url } })}
        onAdd={async () => {
          if (newCompetitorName.trim()) {
            const rawUrl = newCompetitorUrl.trim();
            const validatedUrl = rawUrl ? validateCompetitorUrl(rawUrl) : undefined;
            
            const newCompetitor: IdentifiedCompetitor = {
              name: newCompetitorName.trim(),
              url: validatedUrl
            };
            
            dispatch({ type: 'ADD_COMPETITOR', payload: newCompetitor });
            dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addCompetitor', show: false } });
            dispatch({ type: 'SET_NEW_COMPETITOR', payload: { name: '', url: '' } });
            
            // Batch scrape and validate the new competitor if it has a URL
            if (newCompetitor.url) {
              await batchScrapeAndValidateCompetitors([newCompetitor]);
            }
          }
        }}
        onClose={() => {
          dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'addCompetitor', show: false } });
          dispatch({ type: 'SET_NEW_COMPETITOR', payload: { name: '', url: '' } });
        }}
      />
    </div>
  );
}
