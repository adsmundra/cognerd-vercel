import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { Company, BrandPrompt, AIResponse, CompanyRanking, CompetitorRanking, ProviderSpecificRanking, ProviderComparisonData, ProgressCallback, CompetitorFoundData, Persona } from './types';
import { getProviderModel, normalizeProviderName, isProviderConfigured, getConfiguredProviders, PROVIDER_CONFIGS } from './provider-config';
import { detectBrandMention, detectMultipleBrands, BrandDetectionOptions } from './brand-detection-utils';
import { getBrandDetectionOptions } from './brand-detection-config';
import { COMPETITOR_IDENTIFICATION_PROMPT, PROMPT_GENERATION_SYSTEM_PROMPT, PERSONA_GENERATION_SYSTEM_PROMPT } from '@/prompts';

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

const CompetitorSchema = z.object({
    competitors: z.array(z.object({
        name: z.string(),
        description: z.string(),
        isDirectCompetitor: z.boolean(),
        marketOverlap: z.enum(['high', 'medium', 'low']),
        businessModel: z.string().describe('e.g., DTC brand, SaaS, API service, marketplace'),
        competitorType: z.enum(['direct', 'indirect', 'retailer', 'platform']).describe('direct = same products, indirect = adjacent products, retailer = sells products, platform = aggregates'),
    })),
});

const BasePromptItem = z.object({
    id: z.string().describe("Unique identifier for the prompt"),
    prompt: z.string().describe("The actual search-style query or AI optimization prompt"),
    category: z.enum(["ranking", "comparison", "alternatives", "recommendations"]).describe(
        "Type of prompt for AEO/GEO generation"
    ),
    persona: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    source: z.enum(["ai", "template", "user"]).optional(),
    metadata: z
        .object({
            brandName: z.string().optional(),
            industry: z.string().optional(),
            keywords: z.array(z.string()).optional(),
            competitors: z.array(z.string()).optional(),
        })
        .optional(),
});

export const PromptSchema = z.union([
    z.array(BasePromptItem),
    z.object({ input: z.array(BasePromptItem) }).transform(val => val.input),
    z.object({ prompts: z.array(BasePromptItem) }).transform(val => val.prompts)
]);


export async function identifyCompetitors(company: Company, progressCallback?: ProgressCallback): Promise<string[]> {
    try {
        // Use AI to identify real competitors - find first available provider
        const configuredProviders = getConfiguredProviders();
        // Prioritize OpenAI for competitor identification
        configuredProviders.sort((a, b) => {
            if (a.id === 'openai') return -1;
            if (b.id === 'openai') return 1;
            return 0;
        });

        if (configuredProviders.length === 0) {
            throw new Error('No AI providers configured and enabled');
        }

        // Use the first available provider
        const provider = configuredProviders[0];
        const model = getProviderModel(provider.id, provider.defaultModel);
        if (!model) {
            throw new Error(`${provider.name} model not available`);
        }

        const prompt = COMPETITOR_IDENTIFICATION_PROMPT({
            companyName: company.name,
            industry: company.industry || '',
            description: company.description || '',
            keywords: company.scrapedData?.keywords?.join(', '),
            knownCompetitors: company.scrapedData?.competitors?.join(', '),
            location: company.location
        });

        const { object } = await generateObject({
            model,
            schema: CompetitorSchema,
            prompt,
            temperature: 0.3,
        });

        // Extract competitor names and filter for direct competitors
        // Exclude retailers and platforms unless the company itself is one
        const isRetailOrPlatform = company.industry?.toLowerCase().includes('marketplace') ||
            company.industry?.toLowerCase().includes('platform') ||
            company.industry?.toLowerCase().includes('retailer');

        const competitors = object.competitors
            .filter(c => {
                // Always include direct competitors with high market overlap
                if (c.isDirectCompetitor && c.marketOverlap === 'high') return true;

                // Exclude retailers/platforms for product companies
                if (!isRetailOrPlatform && (c.competitorType === 'retailer' || c.competitorType === 'platform')) {
                    return false;
                }

                // Include other direct competitors and high-overlap indirect competitors
                return c.competitorType === 'direct' || (c.competitorType === 'indirect' && c.marketOverlap === 'high');
            })
            .map(c => c.name)
            .slice(0, 9); // Limit to 9 competitors max

        // Add any competitors found during scraping
        if (company.scrapedData?.competitors) {
            company.scrapedData.competitors.forEach(comp => {
                // Handle legacy mixed type if necessary, but strictly we expect strings now
                const name = typeof comp === 'string' ? comp : (comp as any).name;
                if (!competitors.includes(name)) {
                    competitors.push(name);
                }
            });
        }

        // Send progress events for each competitor found
        if (progressCallback) {
            for (let i = 0; i < competitors.length; i++) {
                progressCallback({
                    type: 'competitor-found',
                    stage: 'identifying-competitors',
                    data: {
                        competitor: competitors[i],
                        index: i + 1,
                        total: competitors.length
                    } as CompetitorFoundData,
                    timestamp: new Date()
                });
            }
        }

        return competitors;
    } catch (error) {
        console.error('Error identifying competitors:', error);
        return company.scrapedData?.competitors?.map(c => typeof c === 'string' ? c : (c as any).name) || [];
    }
}

// Enhanced industry detection function
async function detectIndustryFromContent(company: Company): Promise<string> {
    // Start with explicit industry if set
    if (company.industry) {
        return company.industry;
    }

    // Analyze scraped content for better industry detection
    if (company.scrapedData) {
        const { title, description, mainContent, keywords } = company.scrapedData;

        // Combine all text content for analysis
        const allContent = [title, description, mainContent, ...(keywords || [])].join(' ').toLowerCase();

        // Enhanced keyword detection with context
        if (allContent.includes('web scraping') ||
            allContent.includes('scraping') ||
            allContent.includes('crawling') ||
            allContent.includes('web crawler') ||
            allContent.includes('data extraction') ||
            allContent.includes('html parsing')) {
            return 'web scraping';
        }

        if (allContent.includes('artificial intelligence') ||
            allContent.includes('machine learning') ||
            allContent.includes('ai model') ||
            allContent.includes('llm') ||
            allContent.includes('natural language')) {
            return 'artificial intelligence';
        }

        if (allContent.includes('deployment') ||
            allContent.includes('hosting') ||
            allContent.includes('cloud platform') ||
            allContent.includes('server') ||
            allContent.includes('infrastructure')) {
            return 'deployment platform';
        }

        if (allContent.includes('e-commerce') ||
            allContent.includes('ecommerce') ||
            allContent.includes('online store') ||
            allContent.includes('shopping cart')) {
            return 'e-commerce';
        }

        // Use first keyword as fallback
        if (keywords && keywords.length > 0) {
            return keywords[0];
        }
    }

    return 'technology';
}

export async function generatePersonasForBrand(company: Company): Promise<Persona[]> {
    const brandName = company.name;
    const scrapedData = company.scrapedData;
    const keywords = scrapedData?.keywords || [];
    const mainProducts = scrapedData?.mainProducts || [];
    const description = scrapedData?.description || company.description || '';
    const industry = company.industry || "";
    const location = company.location;

    const configuredProviders = getConfiguredProviders();
    // Prioritize Google (Gemini) for prompt generation
    configuredProviders.sort((a, b) => {
        if (a.id === 'google') return -1;
        if (b.id === 'google') return 1;
        return 0;
    });

    if (configuredProviders.length === 0) {
        console.warn('No AI providers configured for persona generation');
        return [];
    }

    const provider = configuredProviders[0];
    const model = getProviderModel(provider.id, provider.defaultModel);
    if (!model) return [];

    const systemPrompt = PERSONA_GENERATION_SYSTEM_PROMPT({
        brandName,
        industry,
        mainProducts: mainProducts.join(", "),
        keywords: keywords.join(", "),
        description,
        competitors: "", // Competitors not strictly needed for persona gen
        location
    });

    try {
        const { text } = await generateText({
            model,
            system: "You are a marketing strategist. Return only valid JSON.",
            prompt: systemPrompt,
            temperature: 0.5,
        });

        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        const object = JSON.parse(cleanText);

        if (object && Array.isArray(object.personas)) {
            return object.personas.map((p: any, idx: number) => ({
                id: `persona-${idx}`,
                role: p.role || "Unknown Role",
                description: p.description || "",
                painPoints: Array.isArray(p.painPoints) ? p.painPoints : [],
                goals: Array.isArray(p.goals) ? p.goals : [],
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.role || `persona-${idx}`)}`
            }));
        }
    } catch (e) {
        console.error("Failed to generate personas:", e);
    }
    return [];
}


export async function generatePromptsForCompany(
    company: Company,
    competitors: string[],
    customPersonas?: Persona[]
): Promise<BrandPrompt[]> {
    const prompts: BrandPrompt[] = [];
    let promptId = 0;

    const brandName = company.name;
    const scrapedData = company.scrapedData;
    const keywords = scrapedData?.keywords || [];
    const mainProducts = scrapedData?.mainProducts || [];
    const description = scrapedData?.description || company.description || '';
    const industry = company.industry || "";
    const location = company.location;

    // 1. Determine Personas (Use custom or generate new)
    let personas: Persona[] = customPersonas || [];
    if (personas.length === 0) {
        console.log("No custom personas provided, generating personas...");
        personas = await generatePersonasForBrand(company);
        console.log(`Generated ${personas.length} personas.`);
    }

    const configuredProviders = getConfiguredProviders();
    // Prioritize Google (Gemini) for prompt generation
    configuredProviders.sort((a, b) => {
        if (a.id === 'google') return -1;
        if (b.id === 'google') return 1;
        return 0;
    });

    if (configuredProviders.length === 0) {
        throw new Error('No AI providers configured and enabled');
    }

    // Use the first available provider
    const provider = configuredProviders[0];
    const model = getProviderModel(provider.id, provider.defaultModel);
    if (!model) {
        throw new Error(`${provider.name} model not available`);
    }

    // --- System prompt for AI-based prompt generation ---

    // Pass the personas to the prompt generation system
    const systemPrompt = PROMPT_GENERATION_SYSTEM_PROMPT({
        brandName,
        location,
        industry,
        mainProducts: mainProducts.join(", "),
        keywords: keywords.join(", "),
        description,
        competitors: competitors.join(", "),
        personas: personas.length > 0 ? personas : undefined
    });

    // --- Call the AI model ---

    // Use generateText for more control over parsing vs generateObject which can be strict
    const { text } = await generateText({
        model,
        system: "You are a helpful assistant that generates JSON. Only return valid JSON.",
        prompt: systemPrompt,
        temperature: 0.3,
    });

    // --- Parse AI response safely ---
    let object: any = null;
    try {
        // clean text of markdown code blocks if present
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        object = JSON.parse(cleanText);
    } catch (e) {
        console.warn("Failed to parse AI output as JSON:", text.substring(0, 100));
    }

    // Handle different response structures
    let promptsData: any[] = [];
    
    if (Array.isArray(object)) {
        promptsData = object;
    } else if (object && typeof object === 'object') {
        if (Array.isArray(object.input)) {
            promptsData = object.input;
        } else if (Array.isArray(object.prompts)) {
            promptsData = object.prompts;
        } else {
             // Try to find any array property
            const firstArray = Object.values(object).find(val => Array.isArray(val));
            if (firstArray) {
                promptsData = firstArray as any[];
            }
        }
    }

    if (promptsData.length > 0) {
        // Validate and map the data to ensure it matches BrandPrompt shape
        // We use a loose validation here to be forgiving
        return promptsData.map((p, idx) => {
            let promptText = "Unknown prompt";
            let category = "ranking";

            if (typeof p === 'string') {
                promptText = p;
            } else if (typeof p === 'object' && p !== null) {
                promptText = p.prompt || p.text || p.query || p.question || "Unknown prompt";
                category = p.category || "ranking";
            }

            return {
                id: (p && p.id) || (++promptId).toString(),
                prompt: promptText,
                category: category,
                persona: p.persona, // Capture persona if returned
                confidence: (p && typeof p.confidence === 'number') ? p.confidence : undefined,
                source: (p && p.source) || "ai",
                metadata: p && p.metadata
            };
        }) as BrandPrompt[];
    }

    // Fallback if no valid data found
    console.warn("AI returned no valid prompts, using fallback templates.");
    let data: Record<string, string[]> = {

            ranking: [
                `best ${mainProducts[0] || "products"} in 2025`,
                `top ${industry || "brands"} ranked by quality`,
                `most recommended ${mainProducts[0] || "solutions"}`,
            ],
            comparison: [
                `${brandName} vs ${competitors[0] || "top competitors"} for ${
                    mainProducts[0] || "solutions"
                }`,
                `how does ${brandName} compare to other ${industry || "companies"}`,
                `${competitors[0] || "another brand"} or ${brandName} which is better`,
            ],
            alternatives: [
                `alternatives to ${brandName} ${mainProducts[0] || ""}`.trim(),
                `${industry || "brands"} similar to ${brandName}`,
                `competitors of ${brandName} in ${mainProducts[0] || "the same"} market`,
            ],
            recommendations: [
                `is ${brandName} worth buying for ${keywords[0] || "users"}`,
                `${brandName} ${mainProducts[0] || "product"} reviews and recommendations`,
                `should I buy ${brandName} or other ${industry || "brands"}`,
            ],
        };

    // --- Build return array (same structure as original) ---
    Object.entries(data).forEach(([category, templates]) => {
        if (!Array.isArray(templates)) return;
        templates.forEach((prompt) => {
            prompts.push({
                id: (++promptId).toString(),
                prompt,
                category: category as BrandPrompt["category"],
            });
        });
    });

    return prompts;
}



export async function generatePromptsForCompany1(company: Company, competitors: string[]): Promise<BrandPrompt[]> {
    const prompts: BrandPrompt[] = [];
    let promptId = 0;

    const brandName = company.name;

    // Extract context from scraped data
    const scrapedData = company.scrapedData;
    const keywords = scrapedData?.keywords || [];
    const mainProducts = scrapedData?.mainProducts || [];
    const description = scrapedData?.description || company.description || '';

    // Debug log to see what data we're working with
    console.log('Generating prompts for:', {
        brandName,
        industry: company.industry,
        mainProducts,
        keywords: keywords.slice(0, 5),
        competitors: competitors.slice(0, 5)
    });

    // Build a more specific context from the scraped data
    let productContext = '';
    let categoryContext = '';

    // If we have specific products, use those first
    if (mainProducts.length > 0) {
        productContext = mainProducts.slice(0, 2).join(' and ');
        // Infer category from products
        const productsLower = mainProducts.join(' ').toLowerCase();
        if (productsLower.includes('cooler') || productsLower.includes('drinkware')) {
            categoryContext = 'outdoor gear brands';
        } else if (productsLower.includes('software') || productsLower.includes('api')) {
            categoryContext = 'software companies';
        } else {
            categoryContext = `${mainProducts[0]} brands`;
        }
    }

    // Analyze keywords and description to understand what the company actually does
    const keywordsLower = keywords.map(k => k.toLowerCase()).join(' ');
    const descLower = description.toLowerCase();
    const allContext = `${keywordsLower} ${descLower} ${mainProducts.join(' ')}`;

    // Only determine category if we don't already have it from mainProducts
    if (!productContext) {
        // Check industry first for more accurate categorization
        const industryLower = (company.industry || '').toLowerCase();

        if (industryLower === 'outdoor gear' || allContext.includes('cooler') || allContext.includes('drinkware') || allContext.includes('tumbler') || allContext.includes('outdoor')) {
            productContext = 'coolers and drinkware';
            categoryContext = 'outdoor gear brands';
        } else if (industryLower === 'web scraping' || allContext.includes('web scraping') || allContext.includes('data extraction') || allContext.includes('crawler')) {
            productContext = 'web scraping tools';
            categoryContext = 'data extraction services';
        } else if (allContext.includes('ai') || allContext.includes('artificial intelligence') || allContext.includes('machine learning')) {
            productContext = 'AI tools';
            categoryContext = 'artificial intelligence platforms';
        } else if (allContext.includes('software') || allContext.includes('saas') || allContext.includes('application')) {
            productContext = 'software solutions';
            categoryContext = 'SaaS platforms';
        } else if (allContext.includes('clothing') || allContext.includes('apparel') || allContext.includes('fashion')) {
            productContext = 'clothing and apparel';
            categoryContext = 'fashion brands';
        } else if (allContext.includes('furniture') || allContext.includes('home') || allContext.includes('decor')) {
            productContext = 'furniture and home goods';
            categoryContext = 'home furnishing brands';
        } else {
            // Fallback: use the most prominent keywords, but avoid misclassifications
            productContext = keywords.slice(0, 3).join(' and ') || 'products';
            categoryContext = company.industry || 'companies';
        }
    }

    // Safety check: if we somehow got "beverage" but it's clearly not a beverage company
    if (productContext.includes('beverage') && (brandName.toLowerCase() === 'yeti' || allContext.includes('cooler'))) {
        productContext = 'coolers and outdoor gear';
        categoryContext = 'outdoor equipment brands';
    }

    // Generate contextually relevant prompts
    const contextualTemplates = {
        ranking: [
            `best ${productContext} in 2025`,
            `top ${categoryContext} ranked by quality`,
            mainProducts.length > 0 ? `most recommended ${mainProducts[0]}` : `most recommended ${productContext}`,
            keywords.length > 0 ? `best brands for ${keywords[0]}` : `popular ${categoryContext}`,
        ],
        comparison: [
            `${brandName} vs ${competitors.slice(0, 2).join(' vs ')} for ${productContext}`,
            `how does ${brandName} compare to other ${categoryContext}`,
            competitors[0] && mainProducts[0] ? `${competitors[0]} or ${brandName} which has better ${mainProducts[0]}` : `${brandName} compared to alternatives`,
        ],
        alternatives: [
            `alternatives to ${brandName} ${mainProducts[0] || productContext}`,
            `${categoryContext} similar to ${brandName}`,
            `competitors of ${brandName} in ${productContext.split(' ')[0]} market`,
        ],
        recommendations: [
            mainProducts.length > 0 ? `is ${brandName} ${mainProducts[0]} worth buying` : `is ${brandName} worth it for ${productContext}`,
            `${brandName} ${productContext} reviews and recommendations`,
            `should I buy ${brandName} or other ${categoryContext}`,
            `best ${productContext} for ${keywords.includes('professional') ? 'professionals' : keywords.includes('outdoor') ? 'outdoor enthusiasts' : 'everyday use'}`,
        ],
    };

    // Generate prompts from contextual templates
    Object.entries(contextualTemplates).forEach(([category, templates]) => {
        templates.forEach(prompt => {
            prompts.push({
                id: (++promptId).toString(),
                prompt,
                category: category as BrandPrompt['category'],
            });
        });
    });

    return prompts;
}

export async function analyzePromptWithProvider(
    prompt: string,
    provider: string,
    brandName: string,
    competitors: string[],
    useMockMode: boolean = false,
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

    // Get model from centralized configuration
    const model = getProviderModel(normalizedProvider);

    if (!model) {
        console.warn(`Provider ${provider} not configured, skipping provider`);
        // Return null to indicate this provider should be skipped
        return null as any;
    }

    console.log(`${provider} model obtained successfully: ${typeof model}`);
    if (normalizedProvider === 'google') {
        console.log('Google model details:', model);
    }

    const systemPrompt = `You are an AI assistant analyzing brand visibility and rankings.
When responding to prompts about tools, platforms, or services:
1. Provide rankings with specific positions (1st, 2nd, etc.)
2. Focus on the companies mentioned in the prompt
3. Be objective and factual
4. Explain briefly why each tool is ranked where it is
5. If you don't have enough information about a specific company, you can mention that`;

    try {
        // First, get the response
        console.log(`Calling ${provider} with prompt: "${prompt.substring(0, 50)}..."`);

        // Special handling for Google with retry logic
        let text = '';
        let attempts = 0;
        const maxAttempts = normalizedProvider === 'google' ? 3 : 1;

        while (attempts < maxAttempts && (!text || text.length === 0)) {
            attempts++;
            console.log(`${provider} attempt ${attempts}/${maxAttempts}`);

            try {
                const result = await generateText({
                    model,
                    system: systemPrompt,
                    prompt,
                    temperature: normalizedProvider === 'google' ? 0.8 : 0.7, // Higher temperature for Google
                    maxTokens: normalizedProvider === 'google' ? 1000 : 800, // More tokens for Google
                });
                text = result.text;

                if (text && text.length > 0) {
                    console.log(`${provider} success on attempt ${attempts}, response length: ${text.length}`);
                    break;
                } else {
                    console.warn(`${provider} returned empty response on attempt ${attempts}`);
                    if (attempts < maxAttempts) {
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            } catch (attemptError) {
                console.error(`${provider} attempt ${attempts} failed:`, attemptError);
                if (attempts === maxAttempts) {
                    throw attemptError;
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        console.log(`${provider} final response length: ${text.length}, first 100 chars: "${text.substring(0, 100)}"`);

        if (!text || text.length === 0) {
            console.error(`${provider} returned empty response after ${attempts} attempts for prompt: "${prompt}"`);
            throw new Error(`${provider} returned empty response after ${attempts} attempts`);
        }

        // Then analyze it with structured output

        const analysisPrompt = `Analyze this AI response about ${brandName} and its competitors:

Response: "${text}"

Your task:
1. Look for EXPLICIT mentions of "${brandName}" - the company must be directly named or clearly referenced
   - Accept: exact name matches, common abbreviations, official variations
   - REJECT: partial words, unrelated compound words, coincidental substrings

2. For "${brandName}" to be "mentioned", it must appear in one of these contexts:
   - Listed in a ranking or comparison
   - Recommended or discussed by name
   - Compared to other companies
   - Referenced as an alternative or option

3. DO NOT count as mentions:
   - Words that merely contain the brand name as a substring
   - Unrelated terms that happen to match
   - Generic industry terms

4. Look for these competitors with the same strict rules: ${competitors.join(', ')}

5. For each mentioned company, determine:
   - Specific ranking position (if any)
   - Sentiment towards the company

6. Rate your confidence (0-1):
   - 1.0 = Exact, unambiguous mention
   - 0.8 = Clear mention with minor variation
   - 0.6 = Mention with some ambiguity
   - < 0.6 = Uncertain or possible false positive

CRITICAL: Be conservative. When in doubt, mark as NOT mentioned. Only high-confidence detections should be counted.`;


        let object;
        try {
            // Use a fast model for structured output if available
            const analysisModelId = 'google/gemini-2.5-flash:thinking';
            console.log(`Using model for analysis: ${analysisModelId}`);
            
            const structuredModel = getProviderModel('google', analysisModelId) || model;

            const result = await generateObject({
                model: structuredModel,
                schema: RankingSchema,
                prompt: analysisPrompt,
                temperature: 0.3,
                maxRetries: 2,
            });
            object = result.object;
        } catch (error) {
            console.error(`Error generating structured object with ${provider}:`, (error as any).message);

            // For Anthropic, try a simpler text-based approach
            if (provider === 'Anthropic') {
                try {
                    const simplePrompt = `Analyze this AI response about ${brandName} and competitors ${competitors.join(', ')}:

"${text}"

Return a simple analysis:
1. Is ${brandName} mentioned? (yes/no)
2. What position/ranking does it have? (number or "not ranked")
3. Which competitors are mentioned? (list names)
4. What's the overall sentiment? (positive/neutral/negative)`;

                    const { text: simpleResponse } = await generateText({
                        model,
                        prompt: simplePrompt,
                        temperature: 0.3,
                    });

                    // Parse the simple response with enhanced detection
                    const lines = simpleResponse.toLowerCase().split('\n');
                    const aiSaysBrandMentioned = lines.some(line => line.includes('yes'));

                    // Use enhanced detection as fallback
                    const brandDetection = detectBrandMention(text, brandName, {
                        caseSensitive: false,
                        wholeWordOnly: true,
                        includeVariations: true,
                        includeUrlDetection: brandUrls.length > 0,
                        brandUrls: brandUrls.length > 0 ? brandUrls : undefined
                    });

                    const competitors_mentioned = competitors.filter(name => {
                        const urls = competitorUrlMap[name.toLowerCase()];
                        const detection = detectBrandMention(text, name, {
                            caseSensitive: false,
                            wholeWordOnly: true,
                            includeVariations: true,
                            includeUrlDetection: urls && urls.length > 0,
                            brandUrls: urls && urls.length > 0 ? urls : undefined
                        });
                        return detection.mentioned;
                    });

                    return {
                        provider,
                        prompt,
                        response: text,
                        brandMentioned: aiSaysBrandMentioned || brandDetection.mentioned,
                        brandPosition: undefined,
                        competitors: competitors_mentioned,
                        rankings: [],
                        sentiment: 'neutral' as const,
                        confidence: 0.7,
                        timestamp: new Date(),
                    };
                } catch (fallbackError) {
                    console.error('Fallback analysis also failed:', (fallbackError as any).message);
                }
            }

            // Final fallback with enhanced detection
            const brandDetection = detectBrandMention(text, brandName, {
                caseSensitive: false,
                wholeWordOnly: true,
                includeVariations: true,
                includeUrlDetection: brandUrls.length > 0,
                brandUrls: brandUrls.length > 0 ? brandUrls : undefined
            });

            return {
                provider,
                prompt,
                response: text,
                brandMentioned: brandDetection.mentioned,
                brandPosition: undefined,
                competitors: competitors.filter(name => {
                    const urls = competitorUrlMap[name.toLowerCase()];
                    const detection = detectBrandMention(text, name, {
                        caseSensitive: false,
                        wholeWordOnly: true,
                        includeVariations: true,
                        includeUrlDetection: urls && urls.length > 0,
                        brandUrls: urls && urls.length > 0 ? urls : undefined
                    });
                    return detection.mentioned;
                }),
                rankings: [],
                sentiment: 'neutral' as const,
                confidence: brandDetection.confidence * 0.5, // Lower confidence for fallback
                timestamp: new Date(),
            };
        }

        const rankings = object.rankings.map((r): CompanyRanking => ({
            position: r.position,
            company: r.company,
            reason: r.reason,
            sentiment: r.sentiment,
        }));

        // Enhanced fallback with proper brand detection using configured options
        const baseBrandOptions = getBrandDetectionOptions(brandName);
        const brandDetectionOptions = {
            ...baseBrandOptions,
            brandUrls: brandUrls.length > 0 ? brandUrls : baseBrandOptions.brandUrls,
            includeUrlDetection: baseBrandOptions.includeUrlDetection ?? (brandUrls.length > 0),
        };

        // Detect brand mention with enhanced detection
        const brandDetectionResult = detectBrandMention(text, brandName, brandDetectionOptions);
        const brandMentioned = object.analysis.brandMentioned || brandDetectionResult.mentioned;

        // Detect all competitor mentions with their specific options
        const competitorDetectionResults = new Map<string, any>();
        competitors.forEach(competitor => {
            const baseOptions = getBrandDetectionOptions(competitor);
            const urls = competitorUrlMap[competitor.toLowerCase()];
            const competitorOptions = {
                ...baseOptions,
                brandUrls: urls && urls.length > 0 ? urls : baseOptions.brandUrls,
                includeUrlDetection: baseOptions.includeUrlDetection ?? (urls && urls.length > 0),
            };
            const result = detectBrandMention(text, competitor, competitorOptions);
            competitorDetectionResults.set(competitor, result);
        });

        // Combine AI-detected competitors with enhanced detection
        const aiCompetitors = new Set(object.analysis.competitors);
        const allMentionedCompetitors = new Set([...aiCompetitors]);

        // Add competitors found by enhanced detection
        competitorDetectionResults.forEach((result, competitorName) => {
            if (result.mentioned && competitorName !== brandName) {
                allMentionedCompetitors.add(competitorName);
            }
        });

        // Filter competitors to only include the ones we're tracking
        const relevantCompetitors = Array.from(allMentionedCompetitors).filter(c =>
            competitors.includes(c) && c !== brandName
        );

        // Log detection details for debugging
        if (brandDetectionResult.mentioned && !object.analysis.brandMentioned) {
            console.log(`Enhanced detection found brand "${brandName}" in response from ${provider}:`,
                brandDetectionResult.matches.map(m => ({
                    text: m.text,
                    confidence: m.confidence
                }))
            );
        }

        // Get the proper display name for the provider
        const providerDisplayName = provider === 'openai' ? 'OpenAI' :
            provider === 'anthropic' ? 'Anthropic' :
                provider === 'google' ? 'Google' :
                    provider === 'perplexity' ? 'Perplexity' :
                        provider; // fallback to original

        // Debug log for Google responses
        if (provider === 'google' || provider === 'Google') {
            console.log('Google response generated:', {
                originalProvider: provider,
                displayName: providerDisplayName,
                prompt: prompt.substring(0, 50),
                responseLength: text.length,
                brandMentioned
            });
        }

        return {
            provider: providerDisplayName,
            prompt,
            response: text,
            rankings,
            competitors: relevantCompetitors,
            brandMentioned,
            brandPosition: object.analysis.brandPosition,
            sentiment: object.analysis.overallSentiment,
            confidence: object.analysis.confidence,
            timestamp: new Date(),
            detectionDetails: {
                brandMatches: brandDetectionResult.matches.map(m => ({
                    text: m.text,
                    index: m.index,
                    confidence: m.confidence
                })),
                competitorMatches: new Map(
                    Array.from(competitorDetectionResults.entries())
                        .filter(([_, result]) => result.mentioned)
                        .map(([name, result]) => [
                            name,
                            result.matches.map((m: any) => ({
                                text: m.text,
                                index: m.index,
                                confidence: m.confidence
                            }))
                        ])
                )
            }
        };
    } catch (error) {
        console.error(`Error with ${provider}:`, error);

        // Special handling for Google errors
        if (provider === 'Google' || provider === 'google') {
            console.error('Google-specific error details:', {
                message: (error as any).message,
                stack: (error as any).stack,
                name: (error as any).name,
                cause: (error as any).cause,
                prompt: prompt.substring(0, 100),
                modelUsed: normalizedProvider,
                hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
            });

            // If it's an empty response error, try to provide more context
            if ((error as any).message?.includes('empty response')) {
                console.error('Google empty response troubleshooting:', {
                    promptLength: prompt.length,
                    promptType: prompt.includes('?') ? 'question' : 'statement',
                    brandName,
                    competitorsCount: competitors.length,
                    suggestion: 'Try using a different model or adjusting the prompt'
                });
            }
        }

        throw error;
    }
}

export async function analyzeCompetitors(
    company: Company,
    responses: AIResponse[],
    knownCompetitors: string[]
): Promise<CompetitorRanking[]> {
    // Create a set of companies to track (company + its known competitors)
    const trackedCompanies = new Set([company.name, ...knownCompetitors]);

    // Initialize competitor data
    const competitorMap = new Map<string, {
        mentions: number;
        positions: number[];
        sentiments: ('positive' | 'neutral' | 'negative')[];
    }>();

    // Initialize all tracked companies
    trackedCompanies.forEach(companyName => {
        competitorMap.set(companyName, {
            mentions: 0,
            positions: [],
            sentiments: [],
        });
    });

    // Process all responses
    responses.forEach(response => {
        // Track which companies were mentioned in this response
        const mentionedInResponse = new Set<string>();

        // Process rankings if available
        if (response.rankings) {
            response.rankings.forEach(ranking => {
                // Only track companies we care about
                if (trackedCompanies.has(ranking.company)) {
                    const data = competitorMap.get(ranking.company)!;

                    // Only count one mention per response
                    if (!mentionedInResponse.has(ranking.company)) {
                        data.mentions++;
                        mentionedInResponse.add(ranking.company);
                    }

                    data.positions.push(ranking.position);
                    if (ranking.sentiment) {
                        data.sentiments.push(ranking.sentiment);
                    }
                }
            });
        }

        // Count brand mentions (only if not already counted in rankings)
        if (response.brandMentioned && trackedCompanies.has(company.name) && !mentionedInResponse.has(company.name)) {
            const brandData = competitorMap.get(company.name)!;
            brandData.mentions++;
            if (response.brandPosition) {
                brandData.positions.push(response.brandPosition);
            }
            brandData.sentiments.push(response.sentiment);
        }
    });

    // Calculate scores for each competitor
    const totalResponses = responses.length;
    const competitors: CompetitorRanking[] = [];

    competitorMap.forEach((data, name) => {
        const avgPosition = data.positions.length > 0
            ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
            : 99; // High number for companies not ranked

        const sentimentScore = calculateSentimentScore(data.sentiments);
        const visibilityScore = (data.mentions / totalResponses) * 100;

        competitors.push({
            name,
            mentions: data.mentions,
            averagePosition: Math.round(avgPosition * 10) / 10,
            sentiment: determineSentiment(data.sentiments),
            sentimentScore,
            shareOfVoice: 0, // Will calculate after all competitors are processed
            visibilityScore: Math.round(visibilityScore * 10) / 10,
            weeklyChange: undefined, // No historical data available yet
            isOwn: name === company.name,
        });
    });

    // Calculate share of voice
    const totalMentions = competitors.reduce((sum, c) => sum + c.mentions, 0);
    competitors.forEach(c => {
        c.shareOfVoice = totalMentions > 0
            ? Math.round((c.mentions / totalMentions) * 1000) / 10
            : 0;
    });

    // Sort by visibility score
    return competitors.sort((a, b) => b.visibilityScore - a.visibilityScore);
}

function calculateSentimentScore(sentiments: ('positive' | 'neutral' | 'negative')[]): number {
    if (sentiments.length === 0) return 50;

    const sentimentValues = { positive: 100, neutral: 50, negative: 0 };
    const sum = sentiments.reduce((acc, s) => acc + sentimentValues[s], 0);
    return Math.round(sum / sentiments.length);
}

function determineSentiment(sentiments: ('positive' | 'neutral' | 'negative')[]): 'positive' | 'neutral' | 'negative' {
    if (sentiments.length === 0) return 'neutral';

    const counts = { positive: 0, neutral: 0, negative: 0 };
    sentiments.forEach(s => counts[s]++);

    if (counts.positive > counts.negative && counts.positive > counts.neutral) return 'positive';
    if (counts.negative > counts.positive && counts.negative > counts.neutral) return 'negative';
    return 'neutral';
}

export function calculateBrandScores(responses: AIResponse[], brandName: string, competitors: CompetitorRanking[]) {
    const totalResponses = responses.length;
    if (totalResponses === 0) {
        return {
            visibilityScore: 0,
            sentimentScore: 0,
            shareOfVoice: 0,
            overallScore: 0,
            averagePosition: 0,
        };
    }

    // Find the brand's competitor ranking
    const brandRanking = competitors.find(c => c.isOwn);

    if (!brandRanking) {
        return {
            visibilityScore: 0,
            sentimentScore: 0,
            shareOfVoice: 0,
            overallScore: 0,
            averagePosition: 0,
        };
    }

    const visibilityScore = brandRanking.visibilityScore;
    const sentimentScore = brandRanking.sentimentScore;
    const shareOfVoice = brandRanking.shareOfVoice;
    const averagePosition = brandRanking.averagePosition;

    // Calculate position score (lower is better, scale to 0-100)
    const positionScore = averagePosition <= 10
        ? (11 - averagePosition) * 10
        : Math.max(0, 100 - (averagePosition * 2));

    // Overall Score (weighted average)
    const overallScore = (
        visibilityScore * 0.3 +
        sentimentScore * 0.2 +
        shareOfVoice * 0.3 +
        positionScore * 0.2
    );

    return {
        visibilityScore: Math.round(visibilityScore * 10) / 10,
        sentimentScore: Math.round(sentimentScore * 10) / 10,
        shareOfVoice: Math.round(shareOfVoice * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10,
        averagePosition: Math.round(averagePosition * 10) / 10,
    };
}

export async function analyzeCompetitorsByProvider(
    company: Company,
    responses: AIResponse[],
    knownCompetitors: string[]
): Promise<{
    providerRankings: ProviderSpecificRanking[];
    providerComparison: ProviderComparisonData[];
}> {
    const trackedCompanies = new Set([company.name, ...knownCompetitors]);
    const MAX_POSITION_FOR_SCORING = 10;
    const COVERAGE_WEIGHT = 0.6;
    const POSITION_WEIGHT = 0.4;

    // Get configured providers from centralized config
    const configuredProviders = getConfiguredProviders();
    const providers = configuredProviders.map(p => p.name);

    // If no providers available, use mock mode
    if (providers.length === 0) {
        console.warn('No AI providers configured, using default provider list');
        providers.push('OpenAI', 'Anthropic', 'Google');
    }

    // Initialize provider-specific data
    const providerData = new Map<string, Map<string, {
        mentions: number;
        positions: number[];
        sentiments: ('positive' | 'neutral' | 'negative')[];
    }>>();

    // Initialize for each provider
    providers.forEach(provider => {
        const competitorMap = new Map();
        trackedCompanies.forEach(companyName => {
            competitorMap.set(companyName, {
                mentions: 0,
                positions: [],
                sentiments: [],
            });
        });
        providerData.set(provider, competitorMap);
    });

    // Process responses by provider
    responses.forEach(response => {
        const providerMap = providerData.get(response.provider);
        if (!providerMap) return;

        // Track companies already counted for this response to avoid double counting
        const mentionedInResponse = new Set<string>();

        // Process rankings (structured output)
        if (response.rankings) {
            response.rankings.forEach(ranking => {
                if (trackedCompanies.has(ranking.company)) {
                    const data = providerMap.get(ranking.company)!;
                    // Only count one mention per company per response
                    if (!mentionedInResponse.has(ranking.company)) {
                        data.mentions++;
                        mentionedInResponse.add(ranking.company);
                    }
                    data.positions.push(ranking.position);
                    if (ranking.sentiment) {
                        data.sentiments.push(ranking.sentiment);
                    }
                }
            });
        }

        // Also credit competitors detected (fallback path) if present
        if (Array.isArray(response.competitors) && response.competitors.length > 0) {
            response.competitors.forEach(name => {
                if (name === company.name) {
                    // Avoid counting the primary brand from generic competitor lists;
                    // rely on the dedicated brandMentioned flag instead
                    return;
                }

                if (trackedCompanies.has(name)) {
                    const data = providerMap.get(name)!;
                    if (!mentionedInResponse.has(name)) {
                        data.mentions++;
                        mentionedInResponse.add(name);
                    }
                    // We don't have a specific position here; keep sentiments coarse
                    // Use the response-level sentiment as a weak signal
                    if (response.sentiment) {
                        data.sentiments.push(response.sentiment);
                    }
                }
            });
        }

        // Count brand mentions if not already captured above
        if (response.brandMentioned && trackedCompanies.has(company.name)) {
            const brandData = providerMap.get(company.name)!;
            const alreadyCounted = mentionedInResponse.has(company.name)
                || response.rankings?.some(r => r.company === company.name);
            if (!alreadyCounted) {
                brandData.mentions++;
                if (response.brandPosition) {
                    brandData.positions.push(response.brandPosition);
                }
                brandData.sentiments.push(response.sentiment);
                mentionedInResponse.add(company.name);
            }
        }
    });

    // Calculate provider-specific rankings
    const providerRankings: ProviderSpecificRanking[] = [];

    providers.forEach(provider => {
        const competitorMap = providerData.get(provider)!;
        const providerResponses = responses.filter(r => r.provider === provider);
        const totalResponses = providerResponses.length;

        const competitors: CompetitorRanking[] = [];

        competitorMap.forEach((data, name) => {
            const avgPosition = data.positions.length > 0
                ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
                : null;

            const averagePositionValue = avgPosition !== null
                ? Math.round(avgPosition * 10) / 10
                : 0;

            const coverageScore = totalResponses > 0
                ? Math.min(100, (data.mentions / totalResponses) * 100)
                : 0;

            let positionScore = 0;
            if (avgPosition !== null) {
                const clampedPosition = Math.max(1, Math.min(avgPosition, MAX_POSITION_FOR_SCORING));
                positionScore = ((MAX_POSITION_FOR_SCORING - clampedPosition) / (MAX_POSITION_FOR_SCORING - 1)) * 100;
            } else if (data.mentions > 0) {
                // Give partial credit when a mention exists but no ranked position is returned
                positionScore = 35;
            }

            const rawVisibilityScore = ((coverageScore * COVERAGE_WEIGHT) + (positionScore * POSITION_WEIGHT));
            competitors.push({
                name,
                mentions: data.mentions,
                averagePosition: averagePositionValue,
                sentiment: determineSentiment(data.sentiments),
                sentimentScore: calculateSentimentScore(data.sentiments),
                shareOfVoice: 0, // Will calculate after
                visibilityScore: rawVisibilityScore,
                isOwn: name === company.name,
            });
        });

        // Calculate share of voice for this provider
        // Share of voice represents the percentage of total mentions that add up to 100%
        const totalMentions = competitors.reduce((sum, c) => sum + c.mentions, 0);
        competitors.forEach(c => {
            const score = totalMentions > 0
                ? Math.round((c.mentions / totalMentions) * 1000) / 10
                : 0;
            c.shareOfVoice = score;
        });

        // Normalize visibility scores so they sum to 100 for this provider
        const totalVisibility = competitors.reduce((sum, c) => sum + c.visibilityScore, 0);
        if (totalVisibility > 0) {
            competitors.forEach(c => {
                c.visibilityScore = Math.round((c.visibilityScore / totalVisibility) * 1000) / 10;
            });
        } else {
            // Fall back to share of voice if visibility cannot be established
            competitors.forEach(c => {
                c.visibilityScore = c.shareOfVoice;
            });
        }

        // Sort by visibility score
        competitors.sort((a, b) => b.visibilityScore - a.visibilityScore);

        providerRankings.push({
            provider,
            competitors,
        });
    });

    // Create provider comparison data
    const providerComparison: ProviderComparisonData[] = [];

    trackedCompanies.forEach(companyName => {
        const comparisonData: ProviderComparisonData = {
            competitor: companyName,
            providers: {},
            isOwn: companyName === company.name,
        };

        providerRankings.forEach(({ provider, competitors }) => {
            const competitor = competitors.find(c => c.name === companyName);
            if (competitor) {
                comparisonData.providers[provider] = {
                    visibilityScore: competitor.visibilityScore,
                    position: competitor.averagePosition,
                    mentions: competitor.mentions,
                    sentiment: competitor.sentiment,
                };
            }
        });

        providerComparison.push(comparisonData);
    });

    // Sort comparison data by average visibility across providers
    providerComparison.sort((a, b) => {
        const avgA = Object.values(a.providers).reduce((sum, p) => sum + p.visibilityScore, 0) / Object.keys(a.providers).length;
        const avgB = Object.values(b.providers).reduce((sum, p) => sum + p.visibilityScore, 0) / Object.keys(b.providers).length;
        return avgB - avgA;
    });

    return { providerRankings, providerComparison };
}

// Mock response generator for demo mode
function generateMockResponse(
    prompt: string,
    provider: string,
    brandName: string,
    competitors: string[]
): AIResponse {
    // Simulate some delay
    const delay = Math.random() * 500 + 200;

    // Create a realistic-looking ranking
    const allCompanies = [brandName, ...competitors].slice(0, 10);
    const shuffled = [...allCompanies].sort(() => Math.random() - 0.5);

    const rankings: CompanyRanking[] = shuffled.slice(0, 5).map((company, index) => ({
        position: index + 1,
        company,
        reason: `${company} offers strong features in this category`,
        sentiment: Math.random() > 0.7 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative' as const,
    }));

    const brandRanking = rankings.find(r => r.company === brandName);
    const brandMentioned = !!brandRanking || Math.random() > 0.3;
    const brandPosition = brandRanking?.position || (brandMentioned ? Math.floor(Math.random() * 8) + 3 : undefined);

    // Get the proper display name for the provider
    const providerDisplayName = provider === 'openai' ? 'OpenAI' :
        provider === 'anthropic' ? 'Anthropic' :
            provider === 'google' ? 'Google' :
                provider === 'perplexity' ? 'Perplexity' :
                    provider; // fallback to original

    return {
        provider: providerDisplayName,
        prompt,
        response: `Based on my analysis, here are the top solutions:\n\n${rankings.map(r =>
            `${r.position}. ${r.company} - ${r.reason}`
        ).join('\n')}\n\nThese rankings are based on features, user satisfaction, and market presence.`,
        rankings,
        competitors: competitors.filter(() => Math.random() > 0.5),
        brandMentioned,
        brandPosition,
        sentiment: brandRanking?.sentiment || 'neutral',
        confidence: Math.random() * 0.3 + 0.7,
        timestamp: new Date(),
    };
}
