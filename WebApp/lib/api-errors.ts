import { NextResponse } from 'next/server';

// Error codes for different error types
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  PAYMENT_SERVICE_ERROR = 'PAYMENT_SERVICE_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
}

// Base error class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Specific error classes
export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required', code = ErrorCode.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'Access denied', code = ErrorCode.FORBIDDEN) {
    super(message, 403, code);
  }
}

export class ValidationError extends ApiError {
  public readonly fields?: Record<string, string>;

  constructor(
    message = 'Validation failed',
    fields?: Record<string, string>,
    code = ErrorCode.VALIDATION_ERROR
  ) {
    super(message, 400, code);
    this.fields = fields;
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', code = ErrorCode.NOT_FOUND) {
    super(`${resource} not found`, 404, code);
  }
}

export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(
    message = 'Rate limit exceeded',
    retryAfter?: number,
    code = ErrorCode.RATE_LIMIT_EXCEEDED
  ) {
    super(message, 429, code);
    this.retryAfter = retryAfter;
  }
}

export class InsufficientCreditsError extends ApiError {
  public readonly creditsRequired?: number;
  public readonly creditsAvailable?: number;

  constructor(
    message = 'Insufficient credits',
    credits?: { required?: number; available?: number }
  ) {
    super(message, 403, ErrorCode.INSUFFICIENT_CREDITS);
    this.creditsRequired = credits?.required;
    this.creditsAvailable = credits?.available;
  }
}

export class ExternalServiceError extends ApiError {
  public readonly service?: string;

  constructor(
    message: string,
    service?: string,
    code = ErrorCode.EXTERNAL_SERVICE_ERROR
  ) {
    super(message, 503, code);
    this.service = service;
  }
}

export class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed', code = ErrorCode.DATABASE_ERROR) {
    super(message, 500, code, false);
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    fields?: Record<string, string>;
    metadata?: Record<string, any>;
  };
}

// Helper function to create error response
export function createErrorResponse(error: ApiError): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    },
  };

  // Add additional fields for specific error types
  if (error instanceof ValidationError && error.fields) {
    response.error.fields = error.fields;
  }

  if (error instanceof RateLimitError && error.retryAfter) {
    response.error.metadata = { retryAfter: error.retryAfter };
  }

  if (error instanceof InsufficientCreditsError) {
    response.error.metadata = {
      creditsRequired: error.creditsRequired,
      creditsAvailable: error.creditsAvailable,
    };
  }

  if (error instanceof ExternalServiceError && error.service) {
    response.error.metadata = { service: error.service };
  }

  return response;
}

// Main error handler function
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging
  console.error('[API Error]', error);

  // Handle known API errors
  if (error instanceof ApiError) {
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(errorResponse, { status: error.statusCode });
  }

  // Handle Autumn/Stripe errors
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as any;
    if (responseError.response?.data?.error) {
      const message = responseError.response.data.error.message || 'External service error';
      const externalError = new ExternalServiceError(message, 'payment');
      return NextResponse.json(createErrorResponse(externalError), { status: 503 });
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
      const authError = new AuthenticationError();
      return NextResponse.json(createErrorResponse(authError), { status: 401 });
    }

    if (error.message.includes('Database') || error.message.includes('ECONNREFUSED')) {
      const dbError = new DatabaseError();
      return NextResponse.json(createErrorResponse(dbError), { status: 500 });
    }

    // Generic error
    const genericError = new ApiError(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      500,
      ErrorCode.INTERNAL_ERROR,
      false
    );
    return NextResponse.json(createErrorResponse(genericError), { status: 500 });
  }

  // Unknown error type
  const unknownError = new ApiError(
    'An unexpected error occurred',
    500,
    ErrorCode.INTERNAL_ERROR,
    false
  );
  return NextResponse.json(createErrorResponse(unknownError), { status: 500 });
}

// Utility function to wrap async route handlers
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}