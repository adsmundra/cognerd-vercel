import { generateObject } from 'ai';
import { z } from 'zod';
import { Company } from './types';
import FirecrawlApp from '@mendable/firecrawl-js';
import { getConfiguredProviders, getProviderModel } from './provider-config';
import { AIProviderError, logDetailedError, isQuotaError } from './error-utils';
import { debugProviders } from './debug-providers';
import { identifyCompetitors } from './ai-utils';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

// Helper to resolve relative URLs
function resolveUrl(url: string | undefined, base: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, base).href;
  } catch {
    return undefined;
  }
}

// Basic fallback scraping function when Firecrawl fails
async function basicFallbackScrape(url: string): Promise<{ content: string; metadata: any }> {
  try {
    console.log(`[DEBUG] Attempting basic fetch for: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Basic HTML to text conversion
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Extract basic metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    
    const metadata = {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
      ogImage: ogImageMatch ? resolveUrl(ogImageMatch[1].trim(), url) : undefined,
      favicon: faviconMatch ? resolveUrl(faviconMatch[1].trim(), url) : undefined,
    };
    
    return {
      content: textContent.substring(0, 10000), // Limit content length
      metadata
    };
    
  } catch (error) {
    console.error('[DEBUG] Basic fallback scrape failed:', error.message);
    throw error;
  }
}

const CompanyInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  industry: z.string(),
  mainProducts: z.array(z.string()),
  location: z.string().optional().describe('The physical location of the company, e.g., "Austin, TX"'),
  competitors: z.array(z.string()).optional(),
});

export async function scrapeCompanyInfo(url: string, maxAge?: number): Promise<Company> {
  try {
    // Ensure URL has protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    // Default to 1 week cache if not specified
    const cacheAge = maxAge ? Math.floor(maxAge / 1000) : 604800; // 1 week in seconds
    
    console.log(`[DEBUG] Starting scrape for URL: ${normalizedUrl}`);
    
    // Add timeout and retry logic for Firecrawl
    let response;
    let lastError;
    const maxRetries = 2;
    const timeoutMs = 30000; // 30 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[DEBUG] Firecrawl attempt ${attempt}/${maxRetries} for URL: ${normalizedUrl}`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Scrape timeout after 30 seconds')), timeoutMs);
        });
        
        // Race between scrape and timeout
        const scrapePromise = firecrawl.scrapeUrl(normalizedUrl, {
          formats: ['markdown'],
          maxAge: cacheAge,
          timeout: 25000, // Firecrawl internal timeout (25s)
        });
        
        response = await Promise.race([scrapePromise, timeoutPromise]);
        
        console.log(`[DEBUG] Firecrawl response: ${JSON.stringify(response)}`);
        
        if (!response.success) {
          throw new Error(response.error || 'Firecrawl scrape failed');
        }
        
        // Success - break out of retry loop
        break;
        
      } catch (error) {
        lastError = error;
        console.warn(`[DEBUG] Firecrawl attempt ${attempt} failed:`, error.message);
        
        // If this is the last attempt, don't wait
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000; // Progressive backoff: 2s, 4s
          console.log(`[DEBUG] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If all attempts failed, try a basic fallback scrape
    if (!response || !response.success) {
      console.warn('[DEBUG] Firecrawl failed, attempting basic fallback scrape...');
      try {
        const fallbackResult = await basicFallbackScrape(normalizedUrl);
        response = {
          success: true,
          markdown: fallbackResult.content,
          metadata: fallbackResult.metadata
        };
        console.log('[DEBUG] Fallback scrape successful');
      } catch (fallbackError) {
        console.error('[DEBUG] Fallback scrape also failed:', fallbackError.message);
        throw lastError || new Error('All scraping attempts failed');
      }
    }
    const html = response.markdown;
    const metadata = response.metadata;
    
    // Ensure URLs are absolute
    if (metadata) {
        if (metadata.ogImage) {
            metadata.ogImage = resolveUrl(metadata.ogImage, normalizedUrl);
        }
        if (metadata.favicon) {
            metadata.favicon = resolveUrl(metadata.favicon, normalizedUrl);
        }
    }

    console.log('[DEBUG] Firecrawl scrape successful. Markdown length:', html ? html.length : 0);
    

    // Use AI to extract structured information - try providers with fallback
    console.log('[DEBUG] Checking provider configuration...');
    const providerDebug = debugProviders();
    
    const configuredProviders = getConfiguredProviders();
    // Prioritize OpenAI for extraction
    configuredProviders.sort((a, b) => {
      if (a.id === 'openai') return -1;
      if (b.id === 'openai') return 1;
      return 0;
    });

    console.log(`[DEBUG] Found ${configuredProviders.length} configured providers:`, configuredProviders.map(p => p.name));
    
    if (configuredProviders.length === 0) {
      console.error('[DEBUG] No providers available. Debug info:', providerDebug);
      throw new Error('No AI providers configured and enabled for content extraction');
    }
    
    let extractedData;
    let lastAIError;
    
    // Try each configured provider until one succeeds (in priority order)
    for (let i = 0; i < configuredProviders.length; i++) {
      const provider = configuredProviders[i];
      try {
        const model = getProviderModel(provider.id, provider.models.find(m => m.name.toLowerCase().includes('mini') || m.name.toLowerCase().includes('flash'))?.id || provider.defaultModel);
        if (!model) {
          console.warn(`[DEBUG] ${provider.name} model not available, trying next provider`);
          continue;
        }
        
        console.log(`[DEBUG] Attempting AI extraction with ${provider.name} (attempt ${i + 1}/${configuredProviders.length})`);

        const { object } = await generateObject({
          model,
          schema: CompanyInfoSchema,
          prompt: `Extract company information from this website content:
          
          URL: ${normalizedUrl}
          Content: ${html}
          
          Extract the company name, location (city and state/country), a brief description, relevant keywords, and identify the PRIMARY industry category. 
          
          Industry detection rules:
          - Outdoor gear: coolers, drinkware, outdoor equipment, camping gear, fishing, hiking, survival gear.  
          - Web scraping: scraping, crawling, data extraction, HTML parsing, bots, proxies, data aggregator.  
          - AI/ML: AI, machine learning, deep learning, computer vision, NLP, LLM, generative AI.  
          - Cloud/Deployment: hosting, deployment, cloud infrastructure, servers, DevOps, Kubernetes.  
          - E-commerce platforms: online store builder, Shopify competitor, marketplace builder, storefront SaaS.  
          - Direct-to-consumer brand (D2C): sells physical products directly to consumers (clothing, accessories, skincare, beverages, home goods).  
          - Apparel & Fashion: clothing, underwear, footwear, luxury fashion, jewelry, eyewear.  
          - Developer Tools: APIs, SDKs, frameworks, developer platforms, testing tools, CI/CD.  
          - Marketplace: aggregator, multi-vendor platform, gig platforms, P2P rentals, service exchanges.  
          - SaaS (B2B software): CRM, HR, payroll, analytics, workflow, productivity, marketing automation.  
          - Consumer Goods: food, beverages, skincare, wellness, household items, packaged goods.  
          - Fintech: payments, lending, wallets, neobanks, investments, insurance tech.  
          - Healthtech: telemedicine, digital health, wearables, diagnostics, fitness apps.  
          - Edtech: online learning, upskilling, tutoring, digital classrooms.  
          - Mobility/Transportation: ride-hailing, EV, logistics, fleet management, drones.  
          - Hardware/IoT: electronics, devices, wearables, robotics, sensors, smart home.  
          - Media/Entertainment: streaming, gaming, content platforms, social media.  
          - GreenTech/CleanTech: renewable energy, EV charging, carbon credits, recycling, sustainability.  
          - Real Estate/PropTech: housing platforms, rental apps, construction tech, co-living.
          
          IMPORTANT: 
          1. For mainProducts, list the ACTUAL PRODUCTS (e.g., "coolers", "tumblers", "drinkware") not product categories
          2. For competitors, take the brief summary and keywords into consideration then check for the industry of company and extract FULL COMPANY NAMES (e.g., "RTIC", "IGLOO", "Coleman") not just initials
          3. Focus on what the company MAKES/SELLS, not what goes IN their products (e.g., Yeti makes coolers, not beverages)`,
        });
        
        
        extractedData = object;

        // Extract favicon URL - try multiple sources
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname.replace('www.', '');
        
        // Try to get a high-quality favicon from various sources
        const faviconUrl = metadata?.favicon || 
                          `${urlObj.origin}/CogNerdi.png` ||
                          `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

        const companyObject: Company = {
            id: crypto.randomUUID(),
            url: normalizedUrl,
            name: extractedData.name,
            description: extractedData.description,
            industry: extractedData.industry,
            location:extractedData.location,
            logo: metadata?.ogImage || faviconUrl || undefined,
            favicon: faviconUrl, 
            scraped: true,
            scrapedData: {
              title: extractedData.name,
              description: extractedData.description,
              keywords: extractedData.keywords,
              mainContent: html || '',
              mainProducts: extractedData.mainProducts,
              competitors: extractedData.competitors,
              ogImage: metadata?.ogImage || undefined,
              favicon: faviconUrl,
            },
        };

        const sendEvent = async (event: any) => {
          // This is a placeholder. A real implementation streams data to a client.
          // Here, we'll just log the event to the console to show what would be sent.
          console.log('[sendEvent called with]:', event);
        };

        // Now, use the companyObject to identify competitors if none were found
        if (!companyObject.scrapedData.competitors || companyObject.scrapedData.competitors.length === 0) {
          try {
            const newCompetitors = await identifyCompetitors(companyObject, sendEvent);
            // Update both the companyObject and extractedData for consistency
            if (companyObject.scrapedData) {
              companyObject.scrapedData.competitors = newCompetitors;
            }
            extractedData.competitors = newCompetitors;
          } catch (error) {
            console.warn('Failed to identify competitors:', error);
            // Continue without competitors
          }
        }
        console.log(`[DEBUG] AI extraction successful with ${provider.name}`);
        console.log('============================================================');
        console.log('Extracted Data:', extractedData);
        console.log('============================================================');
        
        return companyObject;
      } catch (error) {
        const aiError = new AIProviderError(provider.name, error as Error, {
          url: normalizedUrl,
          modelId: provider.defaultModel,
        });
        lastAIError = aiError;
        
        logDetailedError(aiError, {
          provider: provider.name,
          url: normalizedUrl,
          attempt: i + 1,
          totalProviders: configuredProviders.length,
        });
        
        // Check if it's a quota/billing error
        if (isQuotaError(error as Error)) {
          console.log(`[DEBUG] ${provider.name} quota exceeded, trying next provider`);
          continue;
        }
        
        // For other errors, also try the next provider
        continue;
      }
    }
    
    if (!extractedData) {
      console.error('[DEBUG] All AI providers failed, throwing last error');
      throw lastAIError || new Error('All AI providers failed to extract company information');
    }

    // This should never be reached since we return from the loop above
    throw new Error('Unexpected code path: AI extraction completed but no object returned');
  } catch (error) {
    console.error('Error scraping company info:', error);
    
    // Ensure URL has protocol for fallback
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    // Fallback: extract company name from URL
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.replace('www.', '');
    const companyName = domain.split('.')[0];
    const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);

    return {
      id: crypto.randomUUID(),
      url: normalizedUrl,
      name: formattedName,
      description: `Information about ${formattedName}`,
      industry: 'technology',
      scraped: false,
    };
  }
}