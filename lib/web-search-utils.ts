import { generateText } from 'ai';
import { z } from 'zod';
import { getProviderModel, isProviderConfigured } from './provider-config';

// ============================================
// Provider-Specific Search Configurations
// ============================================
// Note: Each provider should use their native search capabilities
// - OpenAI: Uses responses API with web_search_preview tool
// - Google: Uses search grounding with google_search_retrieval
// - Perplexity: Has built-in web search
// - Anthropic: No native web search (uses base knowledge only)

// ============================================
// Enhanced Brand Analysis with Web Search
// ============================================
// ============================================
// Enhanced Brand Analysis with Provider-Native Search
// ============================================
export async function analyzeBrandWithProviderSearch(
  brandName: string,
  competitors: string[],
  prompt: string,
  provider: 'openai' | 'anthropic' | 'google' | 'perplexity' = 'openai'
) {
  // This function is now handled by ai-utils-enhanced.ts
  // which properly uses each provider's native search capabilities
  throw new Error(
    'This function has been deprecated. Use analyzePromptWithProviderEnhanced from ai-utils-enhanced.ts instead.'
  );
}

// ============================================
// Note on Provider-Native Search Capabilities
// ============================================
// Each provider should use their own search capabilities:
// 
// OpenAI with Web Search:
//   - Use openai.responses('gpt-4o-mini') with web_search_preview tool
//   - Only gpt-4o-mini supports web search via responses API
//
// Google with Search Grounding:
//   - Use { useSearchGrounding: true } option
//   - Automatically includes web search results
//
// Perplexity:
//   - All models have built-in web search
//   - No additional configuration needed
//
// Anthropic:
//   - No native web search capability
//   - Uses base knowledge only

// ============================================
// Competitor Discovery (without web search)
// ============================================
// Note: Competitor discovery is now handled in ai-utils.ts
// using the AI's knowledge base without external search.
// Web scraping via Firecrawl is only used for the initial
// company website analysis in scrape-utils.ts

// ============================================
// Migration Notice
// ============================================
// Web search functionality has been moved to provider-specific implementations:
// - OpenAI: Uses responses API with web_search_preview (in ai-utils-enhanced.ts)
// - Google: Uses search grounding (in provider-config.ts)
// - Perplexity: Built-in web search (no special config needed)
// - Anthropic: No web search (base knowledge only)
//
// Firecrawl should ONLY be used for initial website scraping in scrape-utils.ts