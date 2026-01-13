export interface CompetitorIdentificationParams {
    companyName: string;
    industry: string;
    description: string;
    keywords?: string;
    knownCompetitors?: string;
    location?: string;
}

export const COMPETITOR_IDENTIFICATION_PROMPT = (params: CompetitorIdentificationParams) => `
Identify 10-15 real, established competitors of ${params.companyName} in the ${params.industry} industry.

Company: ${params.companyName}
Industry: ${params.industry}
Description: ${params.description}
${params.location ? `Location: ${params.location}` : ''} 
${params.keywords ? `Keywords: ${params.keywords}` : ''}
${params.knownCompetitors ? `Known competitors: ${params.knownCompetitors}` : ''}

Based on this company's specific business model and target market, identify ONLY direct competitors that:
1. Offer the SAME type of products/services (not just retailers that sell them)
2. Target the SAME customer segment
3. Have a SIMILAR business model (e.g., if it's a DTC brand, find other DTC brands)
4. Actually compete for the same customers
5. If a location is provided, find at least 2 competitors from the same city or region.

For example:
- If it's a DTC underwear brand, find OTHER DTC underwear brands (not department stores)
- If it's a web scraping API, find OTHER web scraping APIs (not general data tools)
- If it's an AI model provider, find OTHER AI model providers (not AI applications)

IMPORTANT:
- Only include companies you are confident actually exist
- If a location is available, ensure at least 2 competitors are location-based.
- Focus on TRUE competitors with similar offerings
- Exclude retailers, marketplaces, or aggregators unless the company itself is one
- Aim for 10-15 competitors total
`;

export const AI_COMPETITOR_DETECTION_PROMPT = (params: { companyName: string; companyContext: string; location?: string; }) => `
Based on the following company information, identify 10-15 direct competitors in the same industry/market segment.

${params.companyContext}
${params.location ? `\nThe company is located in ${params.location}. Please include 2 local competitors from that area if possible.` : ''}

Requirements:
- Focus on DIRECT competitors offering similar products/services to the same target market
- Include well-known industry leaders and emerging players
- If a location is provided, prioritize finding a few local competitors.
- Provide the most common/official domain for each competitor (e.g., "shopify.com", not full URLs)
- Be specific and relevant to this exact business, not generic industry players

Return ONLY a JSON array in this exact format with no additional text:
[
  {"name": "Competitor Name", "url": "domain.com"},
  {"name": "Another Competitor", "url": "example.com"}
]
`;
