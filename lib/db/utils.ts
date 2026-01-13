import { db } from './index';

/**
 * Retry database operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain types of errors
      if (
        error instanceof Error && 
        (error.message.includes('authentication') || 
         error.message.includes('permission') ||
         error.message.includes('not found'))
      ) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`Database operation failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Execute a database query with retry logic
 */
export async function executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, 3, 1000);
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await db.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}