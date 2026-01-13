/**
 * Application Constants
 * Centralized configuration for the application
 */

// Feature IDs for Autumn billing
export const FEATURE_ID_MESSAGES = 'messages';

// Credit costs
export const CREDITS_PER_MESSAGE = 5;
export const CREDITS_PER_BRAND_ANALYSIS = 10;
export const CREDITS_PER_FILE_GENERATION = 30;

// User roles
export const ROLE_USER = 'user';
export const ROLE_ASSISTANT = 'assistant';

// API Configuration
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  CHAT_FEEDBACK: '/api/chat/feedback',
  BRAND_MONITOR_ANALYZE: '/api/brand-monitor/analyze',
  BRAND_MONITOR_SCRAPE: '/api/brand-monitor/scrape',
  CREDITS: '/api/credits',
  USER_PROFILE: '/api/user/profile',
  USER_SETTINGS: '/api/user/settings',
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
} as const;

// Cache configuration
export const ONE_MINUTE = 60 * 1000;
export const CACHE_KEYS = {
  USER_CREDITS: 'user_credits',
  CREDITS: 'credits',
  CONVERSATIONS: 'conversations',
  BRAND_ANALYSIS: 'brand_analysis',
} as const;

// UI Limits
export const UI_LIMITS = {
  TITLE_MAX_LENGTH: 50,
  MESSAGE_MAX_LENGTH: 4000,
  COMPANY_NAME_MAX_LENGTH: 100,
} as const;

// SSE Configuration
export const SSE_MAX_DURATION = 300; // 5 minutes in seconds

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication errors
  AUTHENTICATION_REQUIRED: 'Please log in to access this feature',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  
  // Credit errors
  NO_CREDITS_REMAINING: 'You have no credits remaining. Please upgrade your plan to continue.',
  INSUFFICIENT_CREDITS_BRAND_ANALYSIS: 'Insufficient credits. You need at least 10 credits to run a brand analysis.',
  INSUFFICIENT_CREDITS_MESSAGE: 'Insufficient credits. You need at least 1 credit to send a message.',
  
  // Validation errors
  INVALID_REQUEST: 'Invalid request format',
  COMPANY_INFO_REQUIRED: 'Company information is required',
  MESSAGE_REQUIRED: 'Message is required',
  URL_REQUIRED: 'URL is required',
  
  // External service errors
  AUTUMN_SERVICE_ERROR: 'Unable to process credits. Please try again',
  AI_SERVICE_ERROR: 'AI service is temporarily unavailable. Please try again',
  DATABASE_ERROR: 'Database error occurred. Please try again',
  
  // General errors
  INTERNAL_ERROR: 'An unexpected error occurred',
  FEATURE_UNAVAILABLE: 'This feature is currently unavailable',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ANALYSIS_COMPLETE: 'Brand analysis completed successfully',
  MESSAGE_SENT: 'Message sent successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;

// Status Codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Environment
export const NODE_ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;
