// integrations/openrouter.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Bottleneck from 'bottleneck'; // For rate limiting
import logger from '../utils/logger';
import { AgentMessage } from '../agents/aiAgentManager';
import { runWithRetries } from '../utils/retryHandler';

// --- Constants and Configuration ---
const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';
// Use environment variables for sensitive information
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Default settings as requested
const DEFAULT_TIMEOUT_MS = 180000; // 3 minutes
const DEFAULT_RETRY_ATTEMPTS = 5;
const DEFAULT_EXPONENTIAL_BACKOFF_FACTOR = 2;

// Rate limiting configuration (adjust based on OpenRouter's current limits)
const limiter = new Bottleneck({
  reservoir: 60, // Allow 60 requests per minute
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000, // Refill every minute
  maxConcurrent: 10, // Max concurrent requests
});

// --- Error Handling & Response Types ---
interface OpenRouterErrorResponse {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string;
  };
}

// Define a type for the streaming chunks
interface OpenRouterStreamChunk {
  id: string;
  choices: Array<{
    delta?: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: string | null;
    index: number;
  }>;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Define a type for the non-streaming response
interface OpenRouterChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: OpenRouterErrorResponse['error']; // Include error field for consistency
}

export class StreamingResponse {
  constructor(public stream: AsyncIterable<OpenRouterStreamChunk>) {}
}

// --- Axios Instance Configuration ---
const apiClient: AxiosInstance = axios.create({
  baseURL: OPENROUTER_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Title': 'JARVIS-SANA-CORE', // Custom identifier
  },
  timeout: DEFAULT_TIMEOUT_MS,
});

// Interceptor for rate limiting and error handling on requests
apiClient.interceptors.request.use(limiter.wrap(async (config: InternalAxiosRequestConfig) => {
  // Add X-LLM-Provider header if needed, can be dynamic
  // config.headers['X-LLM-Provider'] = 'OpenRouter'; // Example
  return config;
}), (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    // Handle specific errors, like rate limiting (429)
    if (error.response && error.response.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60'); // Default to 60s if header missing
      logger.warn('Rate limit exceeded. Waiting and retrying.', { retryAfter });
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      // Retry the request using the limiter's wrap mechanism or by re-throwing
      // For simplicity, re-throwing to let the higher-level retry handle it.
      throw error;
    }
    // Handle other HTTP errors
    if (error.response) {
      logger.error('OpenRouter API responded with an error.', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('No response received from OpenRouter API.', { request: error.request });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('Error setting up OpenRouter API request.', { message: error.message });
    }
    return Promise.reject(error);
  }
);


/**
 * Makes a chat completion request to the OpenRouter API.
 * Supports both streaming and non-streaming responses.
 *
 * @param options - Configuration for the API call.
 * @param options.model - The AI model to use.
 * @param options.messages - The conversation history.
 * @param options.stream - Whether to enable streaming responses.
 * @param options.timeoutMs - Request timeout in milliseconds.
 * @param options.temperature - Controls randomness.
 * @param options.max_tokens - Maximum tokens to generate.
 * @param options.top_p - Nucleus sampling probability.
 * @returns A promise resolving to the response, or a StreamingResponse if streaming is enabled.
 */
export async function callOpenRouterAPI(options: {
  model: string;
  messages: AgentMessage[];
  stream?: boolean;
  timeoutMs?: number;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  // Potentially add other options like 'stop', 'presence_penalty', etc.
}): Promise<OpenRouterChatResponse | StreamingResponse | any> { // Use 'any' for broad error catch

  // Validate API Key availability
  if (!OPENROUTER_API_KEY) {
    logger.error('OpenRouter API key is missing. Please set the OPENROUTER_API_KEY environment variable.');
    throw new Error('OpenRouter API key is missing.');
  }

  const { 
    model, 
    messages, 
    stream = false, 
    timeoutMs = DEFAULT_TIMEOUT_MS,
    temperature,
    max_tokens,
    top_p,
  } = options;

   // Ensure temperature and top_p are within valid ranges if provided
   const validTemperature = (temperature !== undefined && temperature >= 0 && temperature <= 2) ? temperature : undefined;
   const validTopP = (top_p !== undefined && top_p >= 0 && top_p <= 1) ? top_p : undefined;

  const requestPayload: Record<string, any> = {
    model: model,
    messages: messages.map(msg => ({ role: msg.role, content: msg.content })), // Map to OpenAI compatible format
    temperature: validTemperature,
    max_tokens: max_tokens,
    top_p: validTopP,
    // stream is handled by the Axios stream configuration implicitly or explicitly
    // Add other parameters like `stop` if necessary
  };

  // Filter out undefined values from payload
  Object.keys(requestPayload).forEach(key => {
      if (requestPayload[key] === undefined) {
          delete requestPayload[key];
      }
  });
  
  logger.debug('Calling OpenRouter API with payload.', { model, messagesCount: messages.length, stream, timeoutMs, payloadKeys: Object.keys(requestPayload) });

  try {
    const response = await limiter.schedule(async () => {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: stream ? '/chat/completions' : '/chat/completions', // Both use same endpoint, stream is handled by responseType
        data: requestPayload,
        responseType: stream ? 'stream' : 'json', // 'stream' for SSE, 'json' for standard response
        timeout: timeoutMs,
        // For streaming, Axios needs specific handling to convert the stream
      };
      return apiClient(config);
    });

    if (stream) {
      // Handle streaming response
      if (response.data) {
        // Axios streams are ReadableStream. We need to convert this into an async iterable
        const streamReader = response.data.getReader();
        const streamAsyncIterable: AsyncIterable<OpenRouterStreamChunk> = {
          [Symbol.asyncIterator]() {
            return {
              async next(): Promise<IteratorResult<OpenRouterStreamChunk>> {
                const { done, value } = await streamReader.read();
                if (done) {
                  return { value: null as any, done: true };
                }
                // Process the chunk: SSE messages are lines, often starting with 'data: '
                // We need to parse these lines into valid JSON chunks.
                // This is a simplified parsing; real-world SSE parsing can be complex.
                const textChunk = Buffer.from(value).toString('utf-8');
                const lines = textChunk.split('\n');
                let parsedChunk: OpenRouterStreamChunk | null = null;
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonData = line.substring(6).trim(); // Remove 'data: ' prefix
                        if (jsonData === '[DONE]') {
                           // End of stream signal
                           return { value: null as any, done: true };
                        }
                        try {
                            parsedChunk = JSON.parse(jsonData);
                            // Yield each valid chunk
                            return { value: parsedChunk, done: false };
                        } catch (e) {
                            logger.error('Failed to parse SSE chunk from OpenRouter stream.', { line, error: e });
                            // Potentially continue to next line or handle error
                        }
                    } else if (line.startsWith('error: ')) {
                        // Handle SSE errors if the provider sends them this way
                        const errorData = line.substring(7).trim();
                        logger.error('Received SSE error from OpenRouter stream.', { errorData });
                        // Throw an error or return an error chunk structure
                        throw new Error(`SSE Error: ${errorData}`);
                    }
                }
                // If no complete chunk found in this read, return { done: false } and wait for next read
                return { value: null as any, done: false }; // Indicate more data might come
              },
            };
          },
        };
        return new StreamingResponse(streamAsyncIterable);
      } else {
        throw new Error('Received empty response for streaming request.');
      }
    } else {
      // Handle non-streaming response
      const responseData: OpenRouterChatResponse = response.data;
      if (responseData.error) {
        logger.error('OpenRouter API returned an error object.', { model, error: responseData.error });
        throw new Error(`OpenRouter API error: ${responseData.error.message} (Code: ${responseData.error.code})`);
      }
      // Provide usage stats if available
      if (responseData.usage) {
        logger.debug('OpenRouter API usage stats.', {
          model,
          prompt_tokens: responseData.usage.prompt_tokens,
          completion_tokens: responseData.usage.completion_tokens,
          total_tokens: responseData.usage.total_tokens,
        });
      }
      return responseData;
    }
  } catch (error: any) {
    // Handle Axios errors, network issues, timeouts, etc.
    let errorMessage = 'An unknown error occurred during OpenRouter API call.';
    let status: string | undefined = undefined;
    let errorDetails = error;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      status = String(error.response.status);
      errorMessage = `OpenRouter API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`;
      errorDetails = error.response.data || error.response;
      logger.error('Error response from OpenRouter API.', { status, data: errorDetails });
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from OpenRouter API. Check network or server status.';
      errorDetails = error.request;
      logger.error('No response from OpenRouter API.', { details: errorDetails });
    } else if (error.code === 'ECONNABORTED') {
      // Request timed out
      errorMessage = `OpenRouter API request timed out after ${timeoutMs}ms.`;
      errorDetails = error;
      logger.error('OpenRouter API request timed out.', { timeoutMs, details: errorDetails });
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Error setting up OpenRouter API request: ${error.message}`;
      errorDetails = error;
      logger.error('Error during OpenRouter API request setup.', { details: errorDetails });
    }

    // Include specific fields for easier debugging and retry logic
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).status = status;
    (enhancedError as any).details = errorDetails;
    (enhancedError as any).requestConfig = error.config; // Original Axios request config
    
    throw enhancedError;
  }
}

// --- Helper to check provider connectivity and model availability ---
export async function checkOpenRouterProviderStatus(): Promise<{ isAvailable: boolean; unavailableModels?: string[]; errorMessage?: string }> {
  if (!OPENROUTER_API_KEY) {
    return { isAvailable: false, errorMessage: 'OpenRouter API key is missing.' };
  }

  try {
    logger.debug('Checking OpenRouter provider status and model availability...');
    // Fetch available models to check connectivity and general model list
    // This requires a specific endpoint, OpenRouter might have `/models` or similar
    // For now, assume a simple call to chat completions with a known model as a proxy check.
    // A better check would be the /models endpoint if available.
    await limiter.schedule(() => apiClient.post('/models', { limit: 1 })); // Dummy call to check auth/base connectivity
    
    // Example of checking specific models (requires endpoint to list models or checking known ones)
    // For now, we assume if the API is reachable, models are generally available.
    // A more robust check would involve iterating through a known list of models.

    logger.info('OpenRouter provider appears to be available.');
    return { isAvailable: true };

  } catch (error: any) {
    logger.error('Error checking OpenRouter provider status.', { message: error.message, status: error.status });
    return { isAvailable: false, errorMessage: error.message || 'Failed to connect to OpenRouter API.' };
  }
}

// Function to get specific model info if endpoint exists
export async function getModelInfo(modelName: string): Promise<any | null> {
    try {
        const response = await limiter.schedule(() =>
            apiClient.get('/models') // Assuming this endpoint lists models
        );
        const model = response.data.data.find((m: any) => m.id === modelName);
        return model || null;
    } catch (error) {
        logger.error(`Could not fetch info for model ${modelName}`, { error });
        return null;
    }
}
