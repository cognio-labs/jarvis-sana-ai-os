// integrations/ollama.ts

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';
import { AgentMessage } from '../agents/aiAgentManager'; // Use common message format

// --- Configuration ---
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 180000; // 3 minutes

interface OllamaOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

// --- Ollama API Response Types ---
interface OllamaErrorResponse {
  error: string;
  context: string[];
}

interface OllamaMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  response: string; // Main content for non-streaming
  done: boolean;
  error?: string;
  context?: number[]; // Session context for multi-turn
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  // Error structure might differ, using a general catch for now
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  response?: string; // Content for streaming
  done: boolean;
  context?: number[];
  // Error structure might differ
  error?: string;
}

// --- Axios Instance Configuration ---
let ollamaApiClient: AxiosInstance | null = null;

function getOllamaApiClient(baseUrl: string): AxiosInstance {
  if (!ollamaApiClient || ollamaApiClient.defaults.baseURL !== baseUrl) {
    ollamaApiClient = axios.create({
      baseURL: baseUrl,
      timeout: DEFAULT_TIMEOUT_MS, // Default timeout
      headers: { 'Content-Type': 'application/json' },
    });
    // Add interceptors if needed (e.g., for error handling)
    ollamaApiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Ollama API request failed.', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }
  return ollamaApiClient;
}

export class OllamaService {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: OllamaOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_OLLAMA_BASE_URL;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    logger.info('OllamaService initialized.', { baseUrl: this.baseUrl });
  }

  /**
   * Sends a chat message to Ollama and returns a response.
   * @param modelName The name of the Ollama model to use.
   * @param prompt The user's prompt or conversation history.
   * @param options Optional parameters like temperature, context, etc.
   * @returns A promise resolving to the Ollama API response.
   */
  async chat(
    modelName: string,
    prompt: string, // Can be a string or structured history depending on Ollama's API evolution
    options: {
      timeout?: number;
      temperature?: number;
      context?: number[]; // Session context for multi-turn
      // Add other Ollama specific options here
    } = {}
  ): Promise<OllamaChatResponse> {
    const apiClient = getOllamaApiClient(this.baseUrl);
    const { timeout = this.timeoutMs, temperature, context } = options;

    const payload: Record<string, any> = {
      model: modelName,
      prompt: prompt, // Ollama's prompt can be string or structured
      stream: false,
      temperature: temperature,
      context: context, // Pass context for follow-up messages
      // Add other Ollama parameters like `num_ctx`, `stop`, etc.
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    logger.debug('Sending chat request to Ollama.', { model: modelName, timeout, promptLength: prompt.length });

    try {
      const response = await apiClient.post<OllamaChatResponse>('/api/generate', payload, { timeout });

      if (response.data.error) {
        throw new Error(`Ollama API error: ${response.data.error}`);
      }
      if (response.data.done && !response.data.response) {
        // Ollama might return 'done: true' with no response if empty or error occurs
        logger.warn('Ollama returned done: true with no response content.', { model: modelName, response: response.data });
        throw new Error('Ollama returned empty response.');
      }
      return response.data;
    } catch (error: any) {
      logger.error(`Error calling Ollama chat API for model ${modelName}.`, {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        timeout: timeout,
      });
      // Enhance error with status and details if available
      const enhancedError = new Error(`Ollama API Error: ${error.message}`);
      (enhancedError as any).status = error.response?.status;
      (enhancedError as any).details = error.response?.data || error;
      throw enhancedError;
    }
  }

  /**
   * Sends a chat message to Ollama and returns a streaming response.
   * @param modelName The name of the Ollama model to use.
   * @param prompt The user's prompt or conversation history.
   * @param options Optional parameters like temperature, context, etc.
   * @returns An async iterable stream of Ollama chunks.
   */
  async *streamChat(
    modelName: string,
    prompt: string,
    options: {
      timeout?: number;
      temperature?: number;
      context?: number[];
    } = {}
  ): AsyncIterable<OllamaStreamChunk> {
    const apiClient = getOllamaApiClient(this.baseUrl);
    const { timeout = this.timeoutMs, temperature, context } = options;

    const payload: Record<string, any> = {
      model: modelName,
      prompt: prompt,
      stream: true, // Enable streaming
      temperature: temperature,
      context: context,
    };
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    logger.debug('Sending streaming chat request to Ollama.', { model: modelName, timeout, promptLength: prompt.length });

    try {
      const response = await apiClient.post<NodeJS.ReadableStream>('/api/generate', payload, {
        responseType: 'stream', // Important for streaming
        timeout: timeout,
      });

      const decoder = new TextDecoder('utf-8');

      let buffer = ''; // Buffer to handle incomplete JSON lines

      for await (const value of response.data) {
        buffer += decoder.decode(value as Buffer, { stream: true }); // Process stream chunk

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Set buffer to the last possibly incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk: OllamaStreamChunk = JSON.parse(line);
              if (chunk.error) {
                logger.error('Ollama stream returned an error.', { model: modelName, error: chunk.error });
                // Yield an error chunk or throw, depending on desired behavior
                yield { ...chunk, error: chunk.error };
                return; // Stop streaming on error
              }
              if (!chunk.done) {
                yield chunk; // Yield the chunk if not done
              } else {
                 // If done is true, yield the last chunk with its content and context
                 yield chunk;
              }
            } catch (e) {
              logger.error('Failed to parse Ollama stream chunk.', { line, error: e });
              // Potentially yield an error chunk or skip
            }
          }
        }
      }
      // Ensure any remaining buffer is processed if it's a valid line
      if (buffer.trim()) {
        try {
            const chunk: OllamaStreamChunk = JSON.parse(buffer);
            if (!chunk.done) yield chunk;
        } catch (e) {
            logger.error('Failed to parse final Ollama stream buffer.', { buffer, error: e });
        }
      }

    } catch (error: any) {
      logger.error(`Error streaming Ollama response for model ${modelName}.`, {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        timeout: timeout,
      });
      // Yield an error chunk or throw, depending on how errors should be propagated
      throw error; // Propagate error, maybe calling function will catch it
    }
  }

  /**
   * Checks if specific Ollama models are available locally.
   * Requires Ollama's /api/tags endpoint to be accessible.
   * @returns A map of model names to their availability status.
   */
  async getAvailableModels(): Promise<{ [modelName: string]: boolean }> {
    const apiClient = getOllamaApiClient(this.baseUrl);
    const availableModels: { [modelName: string]: boolean } = {};

    try {
      logger.debug('Fetching available models from Ollama...');
      const response = await apiClient.get('/api/tags'); // Assuming /api/tags lists models

      if (response.data && Array.isArray(response.data.models)) {
        response.data.models.forEach((modelInfo: any) => {
          availableModels[modelInfo.name] = true;
        });
        logger.info('Ollama models fetched successfully.', { count: response.data.models.length });
      } else {
        logger.warn('Ollama /api/tags returned unexpected data format.', { data: response.data });
        // Assume models are not available if format is unexpected
      }
    } catch (error: any) {
      logger.error('Failed to fetch available models from Ollama.', {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
      });
      // If error occurs, assume no models are available or accessible
    }
    return availableModels;
  }

  /**
   * Checks if Ollama service is running and accessible.
   * @returns True if Ollama is accessible, false otherwise.
   */
  async isServiceAvailable(): Promise<boolean> {
    const apiClient = getOllamaApiClient(this.baseUrl);
    try {
      // Ping the /api/version endpoint (or any other lightweight endpoint)
      await apiClient.get('/api/version');
      logger.info('Ollama service is available.');
      return true;
    } catch (error: any) {
      logger.warn('Ollama service is not available.', { message: error.message });
      return false;
    }
  }
}

export default OllamaService;
