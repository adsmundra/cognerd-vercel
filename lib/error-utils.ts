/**
 * Enhanced error handling utilities for better debugging and user experience
 */

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  cause?: any;
  context?: Record<string, any>;
}

export class DetailedError extends Error {
  public readonly details: ErrorDetails;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ) {
    super(message);
    this.name = 'DetailedError';
    this.timestamp = new Date();
    this.context = context;
    this.details = {
      name: this.name,
      message: this.message,
      stack: this.stack,
      cause: cause?.message || cause,
      context: this.context,
    };

    if (cause) {
      this.cause = cause;
    }
  }
}

export class AIProviderError extends DetailedError {
  constructor(
    provider: string,
    originalError: Error,
    context: Record<string, any> = {}
  ) {
    super(
      `AI Provider (${provider}) failed: ${originalError.message}`,
      { provider, ...context },
      originalError
    );
    this.name = 'AIProviderError';
  }
}

export class DatabaseError extends DetailedError {
  constructor(
    operation: string,
    originalError: Error,
    context: Record<string, any> = {}
  ) {
    super(
      `Database operation (${operation}) failed: ${originalError.message}`,
      { operation, ...context },
      originalError
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Log detailed error information for debugging
 */
export function logDetailedError(error: Error, context: Record<string, any> = {}): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
  };

  console.error('--- DETAILED ERROR ---');
  console.error('Error Name:', errorInfo.name);
  console.error('Error Message:', errorInfo.message);
  console.error('Context:', JSON.stringify(errorInfo.context, null, 2));
  if (errorInfo.stack) {
    console.error('Stack Trace:', errorInfo.stack);
  }
  console.error('--- END DETAILED ERROR ---');
}

/**
 * Check if error is related to quota/billing issues
 */
export function isQuotaError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('billing') ||
    message.includes('insufficient') ||
    message.includes('exceeded') ||
    message.includes('limit') ||
    message.includes('usage')
  );
}

/**
 * Check if error is related to database connectivity
 */
export function isDatabaseConnectionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('terminated') ||
    message.includes('connect') ||
    message.includes('network')
  );
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  if (isQuotaError(error)) {
    return 'AI service quota exceeded. Please try again later or contact support.';
  }
  
  if (isDatabaseConnectionError(error)) {
    return 'Database connection issue. Please try again in a moment.';
  }
  
  if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
    return 'Authentication required. Please log in and try again.';
  }
  
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return 'Invalid request data. Please check your input and try again.';
  }
  
  return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
}

/**
 * Create a sanitized error response for API endpoints
 */
export function createErrorResponse(error: Error, includeStack: boolean = false) {
  const response = {
    error: true,
    message: getUserFriendlyMessage(error),
    type: error.name,
    timestamp: new Date().toISOString(),
  };

  if (includeStack && process.env.NODE_ENV === 'development') {
    return {
      ...response,
      details: {
        originalMessage: error.message,
        stack: error.stack,
      },
    };
  }

  return response;
}