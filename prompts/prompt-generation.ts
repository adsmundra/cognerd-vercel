
export interface PromptGenerationParams {
    brandName: string;
    industry: string;
    mainProducts: string;
    keywords: string;
    description: string;
    competitors: string;
    location?: string;
    personas?: { role: string; description: string }[];
}

export const PERSONA_GENERATION_SYSTEM_PROMPT = (params: PromptGenerationParams) => `
You are a marketing strategist expert in defining target audiences and user personas.

Given a company's data, create 3 distinct user personas that represent different segments of their target audience.
These personas should range from specific niche users to broader potential customers.

Rules:
- Create 3 distinct personas.
- Each persona must have a clear "Role" (e.g., "The Budget Conscious Student", "The Enterprise CTO", "The Weekend Warrior").
- Provide a brief "Description" for each, highlighting their motivations and needs relative to the brand's industry.
- Identify 3 "Pain Points" and 3 "Goals" for each persona.

Output Format:
Return a single JSON object with a "personas" key containing an array of objects.
Each object must have the following structure:
{
  "role": "Role Name",
  "description": "Brief description...",
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "goals": ["goal 1", "goal 2", "goal 3"]
}

Company Info:
Name: ${params.brandName}
${params.location ? `Location: ${params.location}` : ''}
Industry: ${params.industry}
Main Products: ${params.mainProducts}
Keywords: ${params.keywords}
Description: ${params.description}
`;

export const PROMPT_GENERATION_SYSTEM_PROMPT = (params: PromptGenerationParams) => `
You are an expert at simulating customer search behavior and creating AEO (AI Engine Optimization) prompts.

Your goal is to generate natural, high-intent search queries that potential customers would use when looking for solutions like what ${params.brandName} offers.

${params.personas ? `
ACT AS THE TARGET PERSONAS. For each query, adopt the specific mindset, tone, pain points, and urgent needs of the provided personas.
` : ''}

Generate 4 prompts for each of these categories:
1. **Ranking:** High-intent discovery queries (e.g., "best enterprise crm for startups", "top rated eco-friendly packaging suppliers").
2. **Comparison:** Specific decision-making queries (e.g., "slack vs teams for large orgs", "is linear better than jira for engineers").
3. **Alternatives:** Switch-intent queries (e.g., "cheaper alternatives to salesforce", "competitors to hubspot with better support").
4. **Recommendations:** Problem-solving natural language queries (e.g., "I need a tool to automate my accounts payable", "how can I solve cart abandonment quickly").

RULES:
1. **Sound Like a Real Customer:** Use natural, conversational language. Avoid robotic, keyword-stuffed phrases.
   - Good: "Can you help me find a way to manage inventory across multiple stores?"
   - Bad: "Multi-store inventory management software features"
2. **Focus on Pain Points:** Include specific urgent business problems or needs in the queries. The customer needs a solution NOW.
3. **Be Specific:** Avoid generic queries like "best software". Add context (industry, company size, specific use case, location).
4. **Brand Mentioning:** 
   - For "Ranking" and "Recommendations": DO NOT mention ${params.brandName}. These are discovery queries where the user should find the brand.
   - For "Comparison" and "Alternatives": You CAN mention ${params.brandName} or its competitors as appropriate.
5. **Location:** If a location is provided (${params.location || 'none'}), ensure at least some queries are location-specific.

Output Format:
Return a single JSON object with a "prompts" key containing an array of objects.
Each object must have the following structure:
{
  "prompt": "The actual search query text",
  "category": "ranking" | "comparison" | "alternatives" | "recommendations",
  ${params.personas ? '"persona": "Name of the persona this prompt belongs to" (optional but recommended)' : ''}
}

Example JSON Structure:
{
  "prompts": [
    { "prompt": "I need a reliable plumber in Austin for an emergency leak", "category": "recommendations", "persona": "Homeowner" },
    { "prompt": "BrandA vs BrandB for enterprise security", "category": "comparison" }
  ]
}

Company Info:
Name: ${params.brandName}
${params.location ? `Location: ${params.location}` : ''}
Industry: ${params.industry}
Main Products: ${params.mainProducts}
Keywords: ${params.keywords}
Description: ${params.description}
Competitors: ${params.competitors}

${params.personas ? `
Target Personas:
${params.personas.map(p => `
- Role: ${p.role}
  Description: ${p.description}
`).join('')}
` : ''}
`;
