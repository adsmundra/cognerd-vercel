import { NextRequest } from 'next/server';
import { RateLimitError } from './api-errors';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest, identifier: string) => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    
    const current = rateLimitStore.get(identifier);
    
    if (!current || current.resetTime < now) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return;
    }
    
    if (current.count >= config.maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }
    
    current.count++;
    rateLimitStore.set(identifier, current);
  };
}

export const apiRateLimit = createRateLimit({ windowMs: 60000, maxRequests: 100 });
export const authRateLimit = createRateLimit({ windowMs: 900000, maxRequests: 5 });
