
export interface ResponseAnalysisParams {
    brandName: string;
    competitors: string[];
    responseText: string;
}

export const RESPONSE_ANALYSIS_PROMPT = (params: ResponseAnalysisParams) => `
Analyze this AI response about ${params.brandName} and its competitors:

Response: "${params.responseText}"

Your task:
1. Look for ANY mention of ${params.brandName} anywhere in the response, including:
   - Direct mentions (exact name)
   - Variations (with or without spaces, punctuation)
   - With suffixes (Inc, LLC, Corp, etc.)
   - In possessive form (${params.brandName}'s)
   - As part of compound words

2. Look for ANY mention of these competitors: ${params.competitors.join(', ')}
   - Apply the same detection rules as above

3. For each mentioned company, determine if it has a specific ranking position
4. Identify the sentiment towards each mentioned company
5. Rate your confidence in this analysis (0-1)

IMPORTANT:
- A company is "mentioned" if it appears ANYWHERE in the response text, even without a specific ranking
- Count ALL mentions, not just ranked ones
- Be very thorough - check for variations like "${params.brandName}", "${params.brandName.replace(/\s+/g, '')}", "${params.brandName.toLowerCase()}"
- Look in all contexts: listed, compared, recommended, discussed, referenced, etc.

Examples of mentions to catch:
- "${params.brandName} is a great tool" (direct mention)
- "compared to ${params.brandName}" (comparison context)
- "${params.brandName}'s features" (possessive)
- "alternatives like ${params.brandName}" (listing context)
- "${params.brandName.replace(/\s+/g, '')} offers" (no spaces variant)
`;

export const SIMPLE_ANALYSIS_FALLBACK_PROMPT = (params: ResponseAnalysisParams) => `
Analyze this AI response about ${params.brandName} and competitors ${params.competitors.join(', ')}:

"${params.responseText}"

Return a simple analysis:
1. Is ${params.brandName} mentioned? (yes/no)
2. What position/ranking does it have? (number or "not ranked")
3. Which competitors are mentioned? (list names)
4. What's the overall sentiment? (positive/neutral/negative)
`;
