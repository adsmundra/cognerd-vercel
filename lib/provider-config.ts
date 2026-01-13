/**
 * Centralized AI Provider Configuration via OpenRouter
 * This file serves as the single source of truth for all AI provider configurations
 * using OpenRouter as the unified gateway.
 * 
 * To enable/disable providers:
 * 1. Update PROVIDER_ENABLED_CONFIG below
 * 2. Set to true to enable a provider, false to disable it
 * 3. All providers now require a valid OPENROUTER_API_KEY
 */

import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';

// Initialize OpenRouter client
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface ProviderModel {
  id: string; // The OpenRouter model ID (e.g., 'openai/gpt-4o')
  name: string;
  maxTokens?: number;
  supportsFunctionCalling?: boolean;
  supportsStructuredOutput?: boolean;
  supportsWebSearch?: boolean;
}

export interface ProviderCapabilities {
  webSearch: boolean;
  functionCalling: boolean;
  structuredOutput: boolean;
  streamingResponse: boolean;
  maxRequestsPerMinute?: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  envKey: string;
  models: ProviderModel[];
  defaultModel: string;
  capabilities: ProviderCapabilities;
  getModel: (modelId?: string, options?: any) => LanguageModelV1 | null;
  isConfigured: () => boolean;
  enabled: boolean;
}

/**
 * Provider Enable/Disable Configuration
 * Set to true to enable a provider, false to disable it
 */
export const PROVIDER_ENABLED_CONFIG: Record<string, boolean> = {
  openai: true,
  anthropic: false,
  google: true,
  perplexity: false,
  deepseek: false,
  grok: false,
  
};

/**
 * Provider Configuration Registry
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    envKey: 'OPENROUTER_API_KEY',
    enabled: PROVIDER_ENABLED_CONFIG.openai,
    models: [
      {
        id: 'openai/gpt-5-nano',
        name: 'GPT-5o-nano',
        maxTokens: 1280000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: false,
      },
      {
        id: 'openai/gpt-4o-mini:online',
        name: 'GPT-4o Mini',
        maxTokens: 128000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        maxTokens: 128000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
    ],
    defaultModel: 'openai/gpt-4o-mini:online',
    capabilities: {
      webSearch: true,
      functionCalling: true,
      structuredOutput: true,
      streamingResponse: true,
      maxRequestsPerMinute: 500,
    },
    getModel: (modelId?: string, options?: any) => {
      if (!process.env.OPENROUTER_API_KEY) return null;
      return openrouter(modelId || PROVIDER_CONFIGS.openai.defaultModel);
    },
    isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    envKey: 'OPENROUTER_API_KEY',
    enabled: PROVIDER_ENABLED_CONFIG.anthropic,
    models: [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        maxTokens: 200000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
      {
        id: 'anthropic/claude-haiku-4.5:online',
        name: 'Claude 4.5 Haiku',
        maxTokens: 200000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
    ],
    defaultModel: 'anthropic/claude-haiku-4.5:online',
    capabilities: {
      webSearch: true,
      functionCalling: true,
      structuredOutput: true,
      streamingResponse: true,
      maxRequestsPerMinute: 50,
    },
    getModel: (modelId?: string, options?: any) => {
      if (!process.env.OPENROUTER_API_KEY) return null;
      return openrouter(modelId || PROVIDER_CONFIGS.anthropic.defaultModel);
    },
    isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  },

  google: {
    id: 'google',
    name: 'Google',
    icon: '🌟',
    envKey: 'OPENROUTER_API_KEY',
    enabled: PROVIDER_ENABLED_CONFIG.google,
    models: [
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        maxTokens: 1000000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini 1.5 Pro',
        maxTokens: 1000000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
      {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Pro (Free)',
        maxTokens: 1000000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
    ],
    defaultModel: 'google/gemini-2.5-flash:online',
    capabilities: {
      webSearch: true, // Supported via some OpenRouter integrations or mapped models
      functionCalling: true,
      structuredOutput: true,
      streamingResponse: true,
      maxRequestsPerMinute: 200,
    },
    getModel: (modelId?: string, options?: any) => {
      if (!process.env.OPENROUTER_API_KEY) return null;
      return openrouter(modelId || PROVIDER_CONFIGS.google.defaultModel);
    },
    isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    envKey: 'OPENROUTER_API_KEY',
    enabled: PROVIDER_ENABLED_CONFIG.perplexity,
    models: [
      {
        id: 'perplexity/sonar-reasoning',
        name: 'Sonar Reasoning',
        maxTokens: 127000,
        supportsFunctionCalling: false,
        supportsStructuredOutput: false,
        supportsWebSearch: true,
      },
      {
        id: 'perplexity/sonar',
        name: 'Sonar',
        maxTokens: 127000,
        supportsFunctionCalling: false,
        supportsStructuredOutput: false,
        supportsWebSearch: true,
      },
    ],
    defaultModel: 'perplexity/sonar',
    capabilities: {
      webSearch: true,
      functionCalling: false,
      structuredOutput: false,
      streamingResponse: true,
      maxRequestsPerMinute: 20,
    },
    getModel: (modelId?: string, options?: any) => {
      if (!process.env.OPENROUTER_API_KEY) return null;
      return openrouter(modelId || PROVIDER_CONFIGS.perplexity.defaultModel);
    },
    isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🐳',
    envKey: 'OPENROUTER_API_KEY',
    enabled: PROVIDER_ENABLED_CONFIG.deepseek,
    models: [
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat (V3)',
        maxTokens: 64000,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: true,
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        maxTokens: 64000,
        supportsFunctionCalling: false,
        supportsStructuredOutput: false,
        supportsWebSearch: true,
      },
      {
        id: 'deepseek/deepseek-r1-0528:free',
        name: 'DeepSeek R1 (Free)',
        maxTokens: 64000,
        supportsFunctionCalling: false,
        supportsStructuredOutput: false,
        supportsWebSearch: true,
      },
      {
        id: 'deepseek/deepseek-v3.2:online',
        name: 'deepseek-v3.2',
        maxTokens: 64000,
        supportsFunctionCalling: false,
        supportsStructuredOutput: false,
        supportsWebSearch: true,
      },
    ],
    defaultModel: 'deepseek/deepseek-r1-0528:free',
    capabilities: {
      webSearch: true,
      functionCalling: true,
      structuredOutput: true,
      streamingResponse: true,
      maxRequestsPerMinute: 100,
    },
    getModel: (modelId?: string, options?: any) => {
      if (!process.env.OPENROUTER_API_KEY) return null;
      return openrouter(modelId || PROVIDER_CONFIGS.deepseek.defaultModel);
    },
    isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  },

  grok: {
    id: 'grok',
    name: 'Grok',
    icon: '🌌',
    envKey: 'OPENROUTER_API_KEY',
    enabled: PROVIDER_ENABLED_CONFIG.grok,
    models: [
      {
        id: 'x-ai/grok-2-1212',
        name: 'Grok 2',
        maxTokens: 131072,
        supportsFunctionCalling: true,
        supportsStructuredOutput: true,
        supportsWebSearch: false,
      },
      {
        id: 'x-ai/grok-4.1-fast:online',
        name: 'grok-4.1',
        maxTokens: 64000,
        supportsFunctionCalling: false,
        supportsStructuredOutput: false,
        supportsWebSearch: true,
      },
    ],
    defaultModel: 'x-ai/grok-4.1-fast:online',
    capabilities: {
      webSearch: false,
      functionCalling: true,
      structuredOutput: true,
      streamingResponse: true,
      maxRequestsPerMinute: 100,
    },
    getModel: (modelId?: string, options?: any) => {
      if (!process.env.OPENROUTER_API_KEY) return null;
      return openrouter(modelId || PROVIDER_CONFIGS.grok.defaultModel);
    },
    isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  },
};

/**
 * Provider priority order for fallback sequence
 */
export const PROVIDER_PRIORITY: Record<string, number> = {
  google: 1,
  openai: 2,
  anthropic: 3,
  perplexity: 4,
  grok: 5,
  deepseek: 6,
};

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS)
    .filter(provider => provider.enabled && provider.isConfigured())
    .sort((a, b) => {
      const priorityA = PROVIDER_PRIORITY[a.id] || 999;
      const priorityB = PROVIDER_PRIORITY[b.id] || 999;
      return priorityA - priorityB;
    });
}

/**
 * Get providers that support a specific capability
 */
export function getProvidersWithCapability(capability: keyof ProviderCapabilities): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS)
    .filter(provider => provider.enabled && provider.isConfigured() && provider.capabilities[capability])
    .sort((a, b) => {
      const priorityA = PROVIDER_PRIORITY[a.id] || 999;
      const priorityB = PROVIDER_PRIORITY[b.id] || 999;
      return priorityA - priorityB;
    });
}

/**
 * Get a specific provider configuration
 */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerId.toLowerCase()];
}

/**
 * Check if a provider is configured and enabled
 */
export function isProviderConfigured(providerId: string): boolean {
  const provider = getProviderConfig(providerId);
  return (provider?.enabled && provider?.isConfigured()) || false;
}

/**
 * Get provider model instance
 */
export function getProviderModel(
  providerId: string,
  modelId?: string,
  options?: any
): LanguageModelV1 | null {
  const provider = getProviderConfig(providerId);
  if (!provider || !provider.enabled || !provider.isConfigured()) {
    return null;
  }
  return provider.getModel(modelId, options);
}

/**
 * Get provider display info for UI
 */
export function getProviderDisplayInfo(providerId: string): { name: string; icon: string } | null {
  const provider = getProviderConfig(providerId);
  if (!provider) return null;
  return {
    name: provider.name,
    icon: provider.icon,
  };
}

/**
 * Provider name mapping for backward compatibility
 */
export const PROVIDER_NAME_MAP: Record<string, string> = {
  'OpenAI': 'openai',
  'Anthropic': 'anthropic',
  'Google': 'google',
  'Perplexity': 'perplexity',
  'DeepSeek': 'deepseek',
  'Grok': 'grok',
  'xAI': 'grok',
};

/**
 * Normalize provider name for consistency
 */
export function normalizeProviderName(name: string): string {
  return PROVIDER_NAME_MAP[name] || name.toLowerCase();
}

/**
 * Check if a provider is enabled
 */
export function isProviderEnabled(providerId: string): boolean {
  const provider = getProviderConfig(providerId);
  return provider?.enabled || false;
}

/**
 * Get all enabled providers
 */
export function getEnabledProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(provider => provider.enabled);
}
