export interface CompanyAnalysis {
  url: string;
  companyName: string;
  description: string;
  mainTopics: string[];
  generatedPrompts: string[];
}

export interface LLMProvider {
  id: string;
  name: string;
  model: string;
  enabled: boolean;
}

export interface PromptResult {
  provider: string;
  prompt: string;
  response: string;
  mentions: {
    companyName: string;
    mentioned: boolean;
    context?: string;
    position?: number;
  }[];
  timestamp: Date;
}

export interface CompetitorAnalysis {
  competitor: string;
  visibilityScore: number;
  mentionCount: number;
  averagePosition: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  shareOfVoice: number;
  weeklyChange?: number;
  rankChange?: number;
}

export interface BrandVisibilityReport {
  company: string;
  url: string;
  overallVisibilityScore: number;
  promptsAnalyzed: number;
  competitorComparison: CompetitorAnalysis[];
  detailedResults: PromptResult[];
  shareOfVoice: number;
  analyzedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  url: string;
  description?: string;
  industry?: string;
  location?: string;
  logo?: string;
  favicon?: string;
  scraped?: boolean;
  scrapedData?: {
    title: string;
    description: string;
    keywords: string[];
    mainContent: string;
    mainProducts?: string[];
    competitors?: string[];
    ogImage?: string;
    favicon?: string;
  };
}

export interface AIProvider {
  name: string;
  model: string;
  icon?: string;
}

export interface Persona {
  id: string;
  role: string;
  description: string;
  painPoints: string[];
  goals: string[];
  avatar?: string;
}

export interface BrandPrompt {
  id: string;
  prompt: string;
  category: 'ranking' | 'comparison' | 'alternatives' | 'recommendations';
  persona?: string;
  source?: string;
}

export interface AIResponse {
  provider: string;
  prompt: string;
  response: string;
  rankings?: CompanyRanking[];
  competitors: string[];
  brandMentioned: boolean;
  brandPosition?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  timestamp: Date;
  // Enhanced detection information
  detectionDetails?: {
    brandMatches?: {
      text: string;
      index: number;
      confidence: number;
    }[];
    competitorMatches?: Map<string, {
      text: string;
      index: number;
      confidence: number;
    }[]> | Record<string, {
      text: string;
      index: number;
      confidence: number;
    }[]>;
  };
}

export interface CompanyRanking {
  position: number;
  company: string;
  reason?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface BrandAnalysis {
  company: Company;
  prompts: BrandPrompt[];
  responses: AIResponse[];
  competitors: CompetitorRanking[];
  providerRankings?: ProviderSpecificRanking[];
  providerComparison?: ProviderComparisonData[];
  overallScore: number;
  visibilityScore: number;
  sentimentScore: number;
  shareOfVoice: number;
  averagePosition?: number;
  historicalData?: HistoricalDataPoint[];
}

export interface HistoricalDataPoint {
  date: Date;
  visibilityScore: number;
  position: number;
}

// SSE Event Types
export type SSEEventType = 
  | 'start'
  | 'progress'
  | 'stage'
  | 'competitor-found'
  | 'prompt-generated'
  | 'analysis-start'
  | 'analysis-progress'
  | 'analysis-complete'
  | 'scoring-start'
  | 'scoring-complete'
  | 'partial-result'
  | 'complete'
  | 'error';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  stage: AnalysisStage;
  data: T;
  timestamp: Date;
}

export type AnalysisStage = 
  | 'initializing'
  | 'identifying-competitors'
  | 'generating-prompts'
  | 'analyzing-prompts'
  | 'calculating-scores'
  | 'finalizing';

export interface ProgressData {
  stage: AnalysisStage;
  progress: number; // 0-100
  message: string;
  details?: unknown;
}

export interface CompetitorFoundData {
  competitor: string;
  index: number;
  total: number;
}

export interface PromptGeneratedData {
  prompt: string;
  category: string;
  index: number;
  total: number;
}

export interface AnalysisProgressData {
  provider: string;
  prompt: string;
  promptIndex: number;
  totalPrompts: number;
  providerIndex: number;
  totalProviders: number;
  status: 'started' | 'completed' | 'failed';
}

export interface PartialResultData {
  provider: string;
  prompt: string;
  response: Partial<AIResponse>;
  competitorScores?: Partial<CompetitorRanking>[];
}

export interface ScoringProgressData {
  competitor: string;
  score?: number;
  index: number;
  total: number;
}

export interface ErrorData {
  message: string;
  code?: string;
  stage: AnalysisStage;
  retryable?: boolean;
}

// Progress callback type for AI utils
export type ProgressCallback = (event: SSEEvent) => void;

export interface CompetitorRanking {
  name: string;
  logo?: string;
  mentions: number;
  averagePosition: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  shareOfVoice: number;
  visibilityScore: number;
  weeklyChange?: number;
  isOwn?: boolean;
}

export interface ProviderSpecificRanking {
  provider: string;
  competitors: CompetitorRanking[];
}

export interface ProviderComparisonData {
  competitor: string;
  providers: {
    [provider: string]: {
      visibilityScore: number;
      position: number;
      mentions: number;
      sentiment: 'positive' | 'neutral' | 'negative';
    };
  };
  isOwn?: boolean;
}

// AI_PROVIDERS moved to provider-config.ts for centralized management

export const PROMPT_TEMPLATES = {
  ranking: [
    "What are the top 10 {industry} tools in 2024?",
    "List the best {industry} platforms available today",
    "What are the most popular {industry} solutions?",
    "Rank the top {industry} services by features and capabilities",
    "What are the leading {industry} companies?",
  ],
  comparison: [
    "Compare the top 5 {industry} tools including {brand}",
    "How do the major {industry} platforms compare?",
    "What are the pros and cons of different {industry} solutions?",
  ],
  alternatives: [
    "What are the best alternatives to {brand}?",
    "List similar tools to {brand} for {industry}",
    "What other {industry} options are available besides {brand}?",
  ],
  recommendations: [
    "Which {industry} tool would you recommend for businesses?",
    "What's the best {industry} solution for enterprise use?",
    "Which {industry} platform offers the best value?",
  ],
}; 