import { AIResponse, AnalysisProgressData, Company, PartialResultData, ProgressData, PromptGeneratedData, ScoringProgressData, SSEEvent, BrandPrompt } from './types';
import { generatePromptsForCompany, analyzePromptWithProvider, calculateBrandScores, analyzeCompetitors, identifyCompetitors, analyzeCompetitorsByProvider } from './ai-utils';
import { analyzePromptWithProvider as analyzePromptWithProviderEnhanced } from './ai-utils-enhanced';
import { getConfiguredProviders } from './provider-config';

export interface AnalysisConfig {
  company: Company;
  prompts?: BrandPrompt[];
  userSelectedCompetitors?: { name?: string; url?: string }[];
  useWebSearch?: boolean;
  sendEvent: (event: SSEEvent) => Promise<void>;
}

export interface AnalysisResult {
  company: Company;
  knownCompetitors: string[];
  prompts: any[];
  responses: AIResponse[];
  scores: any;
  competitors: any[];
  providerRankings: any;
  providerComparison: any;
  errors?: string[];
  webSearchUsed?: boolean;
}

/**
 * Common analysis logic extracted from both API routes
 */
export async function performAnalysis({
  company,
  prompts,
  userSelectedCompetitors,
  useWebSearch = false,
  sendEvent
}: AnalysisConfig): Promise<AnalysisResult> {
  // Send start event
  await sendEvent({
    type: 'start',
    stage: 'initializing',
    data: { 
      message: `Starting analysis for ${company.name}${useWebSearch ? ' with web search' : ''}` 
    } as ProgressData,
    timestamp: new Date()
  });

  // Stage 1: Identify competitors
  await sendEvent({
    type: 'stage',
    stage: 'identifying-competitors',
    data: { 
      stage: 'identifying-competitors',
      progress: 0,
      message: 'Identifying competitors...'
    } as ProgressData,
    timestamp: new Date()
  });

  // Use user-selected competitors if provided, otherwise identify them
  const sanitizeCompetitors = (list?: { name?: string; url?: string }[]) => {
    if (!list) return [] as { name: string; url?: string }[];

    const seen = new Set<string>();

    return list
      .map(item => ({
        name: (item.name || '').trim(),
        url: item.url?.trim(),
      }))
      .filter(item => {
        if (!item.name) {
          return false;
        }
        const key = item.name.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  };

  let competitorDetails = sanitizeCompetitors(userSelectedCompetitors);
  let competitors: string[];

  if (competitorDetails.length > 0) {
    competitors = competitorDetails.map(c => c.name);
    console.log('Using user-selected competitors:', competitors);
    
    for (let i = 0; i < competitorDetails.length; i++) {
      await sendEvent({
        type: 'competitor-found',
        stage: 'identifying-competitors',
        data: { 
          competitor: competitorDetails[i].name,
          index: i + 1,
          total: competitorDetails.length
        },
        timestamp: new Date()
      });
    }
  } else {
    const identifiedCompetitors = await identifyCompetitors(company, sendEvent);
    competitorDetails = identifiedCompetitors.map(name => ({ name }));
    competitors = identifiedCompetitors;
  }

  const brandUrlSet = new Set<string>();
  if (company.url) {
    const trimmed = company.url.trim();
    if (trimmed) {
      brandUrlSet.add(trimmed);
    }
  }

  const detectionContext: {
    brandUrls: string[];
    competitorUrls: Record<string, string[]>;
  } = {
    brandUrls: Array.from(brandUrlSet).filter(Boolean) as string[],
    competitorUrls: {},
  };

  competitorDetails.forEach(detail => {
    if (!detail.url) return;
    const trimmed = detail.url.trim();
    if (!trimmed) return;
    const key = detail.name.toLowerCase();
    const existing = detectionContext.competitorUrls[key] || [];
    if (!existing.includes(trimmed)) {
      detectionContext.competitorUrls[key] = [...existing, trimmed];
    }
  });

  // Stage 2: Generate prompts
  // Skip the 100% progress for competitors and go straight to the next stage
  await sendEvent({
    type: 'stage',
    stage: 'generating-prompts',
    data: {
      stage: 'generating-prompts',
      progress: 0,
      message: 'Generating analysis prompts...'
    } as ProgressData,
    timestamp: new Date()
  });

  // Use provided prompts if available, otherwise generate them
  let analysisPrompts: BrandPrompt[];
  console.log(prompts ? `Using ${prompts.length} provided prompts` : 'Generating prompts dynamically');
  
  if (prompts && prompts.length > 0) {
    analysisPrompts = prompts;
  } else {
    const generatedPrompts = await generatePromptsForCompany(company, competitors);
    // Note: Changed from 8 to 4 to match UI - this should be configurable
    analysisPrompts = generatedPrompts.slice(0, 4);
  }

  // Send prompt generated events
  for (let i = 0; i < analysisPrompts.length; i++) {
    await sendEvent({
      type: 'prompt-generated',
      stage: 'generating-prompts',
      data: {
        prompt: analysisPrompts[i].prompt,
        category: analysisPrompts[i].category,
        index: i + 1,
        total: analysisPrompts.length
      } as PromptGeneratedData,
      timestamp: new Date()
    });
  }

  // Stage 3: Analyze with AI providers
  // Skip the 100% progress for prompts and go straight to the next stage
  await sendEvent({
    type: 'stage',
    stage: 'analyzing-prompts',
    data: {
      stage: 'analyzing-prompts',
      progress: 0,
      message: `Starting AI analysis${useWebSearch ? ' with web search' : ''}...`
    } as ProgressData,
    timestamp: new Date()
  });

  const responses: AIResponse[] = [];
  const errors: string[] = [];
  
  // Filter providers based on available API keys
  const availableProviders = getAvailableProviders();
  
  console.log('Available providers for analysis:', availableProviders.map(p => p.name));
  console.log('Available provider details:', availableProviders.map(p => ({ name: p.name, model: p.model })));
  console.log('Environment variables:', {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    hasGoogle: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    hasPerplexity: !!process.env.PERPLEXITY_API_KEY
  });
  console.log('Web search enabled:', useWebSearch);
  console.log('Number of prompts:', analysisPrompts.length);
  console.log('Number of available providers:', availableProviders.length);
  
  const totalAnalyses = analysisPrompts.length * availableProviders.length;
  let completedAnalyses = 0;
  console.log('Total analyses to perform:', totalAnalyses);

  // Check if we should use mock mode (no API keys configured)
  const useMockMode = process.env.USE_MOCK_MODE === 'true' || availableProviders.length === 0;

  // Process prompts in parallel batches of 3
  const BATCH_SIZE = 3;
  
  for (let batchStart = 0; batchStart < analysisPrompts.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, analysisPrompts.length);
    const batchPrompts = analysisPrompts.slice(batchStart, batchEnd);
    
    // Create all analysis promises for this batch
    const batchPromises = batchPrompts.flatMap((prompt, batchIndex) => 
      availableProviders.map(async (provider) => {
        const promptIndex = batchStart + batchIndex;
        
        // Send analysis start event
        await sendEvent({
          type: 'analysis-start',
          stage: 'analyzing-prompts',
          data: {
            provider: provider.name,
            prompt: prompt.prompt,
            promptIndex: promptIndex + 1,
            totalPrompts: analysisPrompts.length,
            providerIndex: 0,
            totalProviders: availableProviders.length,
            status: 'started'
          } as AnalysisProgressData,
          timestamp: new Date()
        });

        try {
          // Debug log for each provider attempt
          console.log(`Attempting analysis with provider: ${provider.name} for prompt: "${prompt.prompt.substring(0, 50)}..."`);
          
          let response: AIResponse | null;
          if (useWebSearch) {
            response = await analyzePromptWithProviderEnhanced(
              prompt.prompt,
              provider.name,
              company.name,
              competitors,
              useMockMode,
              true,
              detectionContext
            );
          } else {
            response = await analyzePromptWithProvider(
              prompt.prompt,
              provider.name,
              company.name,
              competitors,
              useMockMode,
              detectionContext
            );
          }
          
          console.log(`Analysis completed for ${provider.name}:`, {
            hasResponse: !!response,
            provider: response?.provider,
            brandMentioned: response?.brandMentioned
          });
          
          // Skip if provider returned null (not configured)
          if (response === null) {
            console.log(`Skipping ${provider.name} - not configured`);
            
            // Send analysis complete event with skipped status
            await sendEvent({
              type: 'analysis-complete',
              stage: 'analyzing-prompts',
              data: {
                provider: provider.name,
                prompt: prompt.prompt,
                promptIndex: promptIndex + 1,
                totalPrompts: analysisPrompts.length,
                providerIndex: 0,
                totalProviders: availableProviders.length,
                status: 'failed'
              } as AnalysisProgressData,
              timestamp: new Date()
            });
            
            return; // Return early instead of continue
          }
          
          // If using mock mode, add a small delay for visual effect
          if (useMockMode) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          }
          
          responses.push(response);

          // Send partial result
          await sendEvent({
            type: 'partial-result',
            stage: 'analyzing-prompts',
            data: {
              provider: provider.name,
              prompt: prompt.prompt,
              response: {
                provider: response.provider,
                brandMentioned: response.brandMentioned,
                brandPosition: response.brandPosition,
                sentiment: response.sentiment
              }
            } as PartialResultData,
            timestamp: new Date()
          });

          // Send analysis complete event
          await sendEvent({
            type: 'analysis-complete',
            stage: 'analyzing-prompts',
            data: {
              provider: provider.name,
              prompt: prompt.prompt,
              promptIndex: promptIndex + 1,
              totalPrompts: analysisPrompts.length,
              providerIndex: 0,
              totalProviders: availableProviders.length,
              status: 'completed'
            } as AnalysisProgressData,
            timestamp: new Date()
          });

        } catch (error) {
          console.error(`Error with ${provider.name} for prompt "${prompt.prompt}":`, error);
          errors.push(`${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // Send analysis failed event
          await sendEvent({
            type: 'analysis-complete',
            stage: 'analyzing-prompts',
            data: {
              provider: provider.name,
              prompt: prompt.prompt,
              promptIndex: promptIndex + 1,
              totalPrompts: analysisPrompts.length,
              providerIndex: 0,
              totalProviders: availableProviders.length,
              status: 'failed'
            } as AnalysisProgressData,
            timestamp: new Date()
          });
        }

        completedAnalyses++;
        const progress = Math.round((completedAnalyses / totalAnalyses) * 100);
        
        await sendEvent({
          type: 'progress',
          stage: 'analyzing-prompts',
          data: {
            stage: 'analyzing-prompts',
            progress,
            message: `Completed ${completedAnalyses} of ${totalAnalyses} analyses`
          } as ProgressData,
          timestamp: new Date()
        });
      })
    );
    
    // Wait for all promises in this batch to complete
    await Promise.all(batchPromises);

    // Add a 30-second cool-off period after each batch
    if (batchEnd < analysisPrompts.length) { // Don't wait after the last batch
        console.log('Cooldown period: waiting 30 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  // Stage 4: Calculate scores
  await sendEvent({
    type: 'stage',
    stage: 'calculating-scores',
    data: {
      stage: 'calculating-scores',
      progress: 0,
      message: 'Calculating brand visibility scores...'
    } as ProgressData,
    timestamp: new Date()
  });

  // Analyze competitors from all responses
  const competitorRankings = await analyzeCompetitors(company, responses, competitors);

  if (competitorDetails.length > 0) {
    const existing = new Set(competitorRankings.map(entry => entry.name.toLowerCase()));
    competitorDetails.forEach(({ name }) => {
      const key = name.toLowerCase();
      if (!existing.has(key)) {
        competitorRankings.push({
          name,
          mentions: 0,
          averagePosition: 99,
          sentiment: 'neutral',
          sentimentScore: 50,
          shareOfVoice: 0,
          visibilityScore: 0,
          weeklyChange: undefined,
          isOwn: false,
        });
        existing.add(key);
      }
    });
  }

  // Send scoring progress for each competitor
  for (let i = 0; i < competitorRankings.length; i++) {
    await sendEvent({
      type: 'scoring-start',
      stage: 'calculating-scores',
      data: {
        competitor: competitorRankings[i].name,
        score: competitorRankings[i].visibilityScore,
        index: i + 1,
        total: competitorRankings.length
      } as ScoringProgressData,
      timestamp: new Date()
    });
  }

  // Analyze competitors by provider
  const { providerRankings, providerComparison } = await analyzeCompetitorsByProvider(
    company, 
    responses, 
    competitors
  );

  // Calculate final scores
  const scores = calculateBrandScores(responses, company.name, competitorRankings);

  await sendEvent({
    type: 'progress',
    stage: 'calculating-scores',
    data: {
      stage: 'calculating-scores',
      progress: 100,
      message: 'Scoring complete'
    } as ProgressData,
    timestamp: new Date()
  });

  // Stage 5: Finalize
  await sendEvent({
    type: 'stage',
    stage: 'finalizing',
    data: {
      stage: 'finalizing',
      progress: 100,
      message: 'Analysis complete!'
    } as ProgressData,
    timestamp: new Date()
  });

  return {
    company,
    knownCompetitors: competitors,
    prompts: analysisPrompts,
    responses,
    scores,
    competitors: competitorRankings,
    providerRankings,
    providerComparison,
    errors: errors.length > 0 ? errors : undefined,
    webSearchUsed: useWebSearch,
  };
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders() {
  const configuredProviders = getConfiguredProviders();
  // Map to the format expected by the rest of the code
  return configuredProviders.map(provider => ({
    name: provider.name,
    model: provider.defaultModel,
    icon: provider.icon,
  }));
}

/**
 * Create SSE message with proper format
 */
export function createSSEMessage(event: SSEEvent): string {
  // Ensure proper SSE format with event type
  const lines: string[] = [];
  if (event.type) {
    lines.push(`event: ${event.type}`);
  }
  lines.push(`data: ${JSON.stringify(event)}`);
  lines.push(''); // Empty line to signal end of event
  lines.push(''); // Extra newline for proper SSE format
  return lines.join('\n');
}
