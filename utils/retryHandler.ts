// utils/retryHandler.ts

import logger from './logger';

interface RetryOptions {
  retries?: number;
  delay?: number; // Delay in ms
  exponentialBackoff?: boolean;
  factor?: number; // Factor for exponential backoff
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  delay: 1000, // 1 second default delay
  exponentialBackoff: true,
  factor: 2,
};

/**
 * A higher-order function that wraps an async function with retry logic.
 * @param asyncFn The async function to wrap.
 * @param options Retry options.
 * @returns A new async function with retry logic applied.
 */
export const withRetry = <T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  options?: RetryOptions
) => {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const { retries, delay, exponentialBackoff, factor } = mergedOptions;

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let currentDelay = delay;
    let currentRetries = retries;

    while (currentRetries >= 0) {
      try {
        // Attempt to execute the function
        const result = await asyncFn(...args);
        return result;
      } catch (error: any) {
        currentRetries--;
        if (currentRetries < 0) {
          logger.error('Max retries reached. Function failed.', {
            message: error.message,
            stack: error.stack,
            originalArgs: args,
          });
          throw error; // Re-throw the original error after exhausting retries
        }

        logger.warn('Function failed, retrying...', {
          attempt: retries - currentRetries,
          maxAttempts: retries + 1,
          delay: currentDelay,
          error: error.message,
          originalArgs: args,
        });

        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, currentDelay));

        // Apply exponential backoff if enabled
        if (exponentialBackoff) {
          currentDelay = Math.floor(currentDelay * factor);
        }
      }
    }
    // This part should ideally be unreachable due to the throw above,
    // but TypeScript requires a return or throw here.
    throw new Error('Retry logic failed unexpectedly.');
  };
};

/**
 * A simple retrier that takes a function and attempts to execute it with retry logic.
 * @param fn The function to execute.
 * @param context Additional context for logging.
 * @returns A promise that resolves with the result of fn or rejects after retries.
 */
export const runWithRetries = async (
  fn: () => Promise<any>,
  context: Record<string, any> = {}
): Promise<any> => {
  const { retries = 3, delay = 1000, exponentialBackoff = true, factor = 2 } = context;
  let currentDelay = delay;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const result = await fn();
      if (attempt > 0) {
        logger.info(`Operation succeeded after ${attempt} retries.`, context);
      }
      return result;
    } catch (error: any) {
      attempt++;
      if (attempt > retries) {
        logger.error(`Operation failed after ${retries + 1} attempts.`, { ...context, error: error.message });
        throw error;
      }

      logger.warn(`Operation failed (attempt ${attempt}/${retries + 1}), retrying...`, { ...context, error: error.message, delay: currentDelay });
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      if (exponentialBackoff) {
        currentDelay = Math.floor(currentDelay * factor);
      }
    }
  }
  // Should not be reached
  throw new Error('Failed to execute operation within retry limits.');
};
