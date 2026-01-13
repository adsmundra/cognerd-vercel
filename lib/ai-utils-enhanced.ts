import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { Company, BrandPrompt, AIResponse, CompanyRanking, CompetitorRanking, ProviderSpecificRanking, ProviderComparisonData, ProgressCallback, CompetitorFoundData } from './types';
import { getProviderModel, normalizeProviderName, isProviderConfigured, getProviderConfig, PROVIDER_CONFIGS } from './provider-config';
import { detectBrandMention } from './brand-detection-utils';
import { getBrandDetectionOptions } from './brand-detection-config';

const RankingSchema = z.object({
  rankings: z.array(z.object({
    position: z.number(),
    company: z.string(),
    reason: z.string().optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  })),
  analysis: z.object({
    brandMentioned: z.boolean(),
    brandPosition: z.number().optional(),
    competitors: z.array(z.string()),
    overallSentiment: z.enum(['positive', 'neutral', 'negative']),
    confidence: z.number().min(0).max(1),
  }),
});

// Enhanced version with web search grounding
export async function analyzePromptWithProviderEnhanced(
  prompt: string,
  provider: string,
  brandName: string,
  competitors: string[],
  useMockMode: boolean = false,
  useWebSearch: boolean = true, // New parameter
  detectionContext?: {
    brandUrls?: string[];
    competitorUrls?: Record<string, string[]>;
  }
): Promise<AIResponse> {
  // Mock mode for demo/testing without API keys
  if (useMockMode || provider === 'Mock') {
    return generateMockResponse(prompt, provider, brandName, competitors);
  }

  const brandUrls = detectionContext?.brandUrls ?? [];
  const competitorUrlMap = detectionContext?.competitorUrls ?? {};

  // Normalize provider name for consistency
  const normalizedProvider = normalizeProviderName(provider);
  const providerConfig = getProviderConfig(normalizedProvider);
  
  if (!providerConfig || !providerConfig.isConfigured()) {
    console.warn(`Provider ${provider} not configured, skipping provider`);
    return null as any;
  }
  
  // Get model with web search options if supported
  const model = getProviderModel(normalizedProvider, undefined, { useWebSearch });
  
  if (!model) {
    console.warn(`Failed to get model for ${provider}`);
    return null as any;
  }

  const systemPrompt = `You are an AI assistant analyzing brand visibility and rankings.
When responding to prompts about tools, platforms, or services:
1. Provide rankings with specific positions (1st, 2nd, etc.)
2. Focus on the companies mentioned in the prompt
3. Be objective and factual${useWebSearch ? ', using current web information when available' : ''}
4. Explain briefly why each tool is ranked where it is
5. If you don't have enough information about a specific company, you can mention that
6. ${useWebSearch ? 'Prioritize recent, factual information from web searches' : 'Use your knowledge base'}`;

  // Enhanced prompt for web search
  const enhancedPrompt = useWebSearch 
    ? `${prompt}\n\nPlease search for current, factual information to answer this question. Focus on recent data and real user opinions.`
    : prompt;

  try {
    // First, get the response with potential web search
    const { text, sources } = await generateText({
      model,
      system: systemPrompt,
      prompt: enhancedPrompt,
      temperature: 0.7,
      maxTokens: 800,
    });

    // Then analyze it with structured output
    const analysisPrompt = `Analyze this AI response about ${brandName} and its competitors:

Response: "${text}"

Your task:
1. Look for ANY mention of ${brandName} anywhere in the response (even if not ranked)
2. Look for ANY mention of these competitors: ${competitors.join(', ')}
3. For each mentioned company, determine if it has a specific ranking position
4. Identify the sentiment towards each mentioned company
5. Rate your confidence in this analysis (0-1)

IMPORTANT: A company is "mentioned" if it appears anywhere in the response text, even without a specific ranking. Count ALL mentions, not just ranked ones.

Be very thorough in detecting company names - they might appear in different contexts (listed, compared, recommended, etc.)`;

    let object;
    try {
      // Use a fast model for structured output
      const analysisModelId = 'openai/gpt-5-nano:thinking';
      console.log(`Using model for analysis: ${analysisModelId}`);
      
      const analysisModel = getProviderModel('openai', analysisModelId);
      if (!analysisModel) {
        throw new Error('Analysis model not available');
      }
      
      const result = await generateObject({
        model: analysisModel,
        system: 'You are an expert at analyzing text and extracting structured information about companies and rankings.',
        prompt: analysisPrompt,
        schema: RankingSchema,
        temperature: 0.3,
      });
      object = result.object;
    } catch (error) {
      console.error('Structured analysis failed:', error);
      // Fallback to basic analysis
      const textLower = text.toLowerCase();
      const brandNameLower = brandName.toLowerCase();
      
      // More robust brand detection
      const mentioned = textLower.includes(brandNameLower) ||
        textLower.includes(brandNameLower.replace(/\s+/g, '')) ||
        textLower.includes(brandNameLower.replace(/[^a-z0-9]/g, ''));
        
      // More robust competitor detection
      const detectedCompetitors = competitors.filter(c => {
        const cLower = c.toLowerCase();
        return textLower.includes(cLower) ||
          textLower.includes(cLower.replace(/\s+/g, '')) ||
          textLower.includes(cLower.replace(/[^a-z0-9]/g, ''));
      });
      
      object = {
        rankings: [],
        analysis: {
          brandMentioned: mentioned,
          brandPosition: undefined,
          competitors: detectedCompetitors,
          overallSentiment: 'neutral' as const,
          confidence: 0.5,
        },
      };
    }

    // Fallback detection combining enhanced detection with simple heuristics
    const textLower = text.toLowerCase();
    const brandNameLower = brandName.toLowerCase();

    const baseBrandOptions = getBrandDetectionOptions(brandName);
    const brandDetectionOptions = {
      ...baseBrandOptions,
      brandUrls: brandUrls.length > 0 ? brandUrls : baseBrandOptions.brandUrls,
      includeUrlDetection: baseBrandOptions.includeUrlDetection ?? (brandUrls.length > 0),
    };

    const brandDetectionResult = detectBrandMention(text, brandName, brandDetectionOptions);

    let brandMentioned = object.analysis.brandMentioned || brandDetectionResult.mentioned;
    if (!brandMentioned) {
      brandMentioned =
        textLower.includes(brandNameLower) ||
        textLower.includes(brandNameLower.replace(/\s+/g, '')) ||
        textLower.includes(brandNameLower.replace(/[^a-z0-9]/g, ''));
    }

    const aiCompetitors = new Set(object.analysis.competitors);
    const allMentionedCompetitors = new Set([...aiCompetitors]);

    competitors.forEach(competitor => {
      const baseOptions = getBrandDetectionOptions(competitor);
      const urls = competitorUrlMap[competitor.toLowerCase()];
      const competitorOptions = {
        ...baseOptions,
        brandUrls: urls && urls.length > 0 ? urls : baseOptions.brandUrls,
        includeUrlDetection: baseOptions.includeUrlDetection ?? (urls && urls.length > 0),
      };

      const detection = detectBrandMention(text, competitor, competitorOptions);
      const competitorLower = competitor.toLowerCase();

      if (detection.mentioned && competitor !== brandName) {
        allMentionedCompetitors.add(competitor);
        return;
      }

      if (
        textLower.includes(competitorLower) ||
        textLower.includes(competitorLower.replace(/\s+/g, '')) ||
        textLower.includes(competitorLower.replace(/[^a-z0-9]/g, ''))
      ) {
        allMentionedCompetitors.add(competitor);
      }
    });

    // Filter competitors to only include the ones we're tracking
    const relevantCompetitors = Array.from(allMentionedCompetitors).filter(c => 
      competitors.includes(c) && c !== brandName
    );

    // Get the proper display name for the provider
    const providerDisplayName = provider === 'openai' ? 'OpenAI' :
                               provider === 'anthropic' ? 'Anthropic' :
                               provider === 'google' ? 'Google' :
                               provider === 'perplexity' ? 'Perplexity' :
                               provider; // fallback to original

    return {
      provider: providerDisplayName,
      prompt,
      response: text,
      rankings: object.rankings,
      competitors: relevantCompetitors,
      brandMentioned,
      brandPosition: object.analysis.brandPosition,
      sentiment: object.analysis.overallSentiment,
      confidence: object.analysis.confidence,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Error with ${provider}:`, error);
    throw error;
  }
}

// Helper function to generate mock responses
function generateMockResponse(
  prompt: string,
  provider: string,
  brandName: string,
  competitors: string[]
): AIResponse {
  const mentioned = Math.random() > 0.3;
  const position = mentioned ? Math.floor(Math.random() * 5) + 1 : undefined;
  
  // Get the proper display name for the provider
  const providerDisplayName = provider === 'openai' ? 'OpenAI' :
                             provider === 'anthropic' ? 'Anthropic' :
                             provider === 'google' ? 'Google' :
                             provider === 'perplexity' ? 'Perplexity' :
                             provider; // fallback to original
  
  return {
    provider: providerDisplayName,
    prompt,
    response: `Mock response for ${prompt}`,
    rankings: competitors.slice(0, 5).map((comp, idx) => ({
      position: idx + 1,
      company: comp,
      reason: 'Mock reason',
      sentiment: 'neutral' as const,
    })),
    competitors: competitors.slice(0, 3),
    brandMentioned: mentioned,
    brandPosition: position,
    sentiment: mentioned ? 'positive' : 'neutral',
    confidence: 0.8,
    timestamp: new Date(),
  };
}

// Export the enhanced function as the default
export { analyzePromptWithProviderEnhanced as analyzePromptWithProvider };
