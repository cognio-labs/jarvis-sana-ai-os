// agents/aiAgentManager.ts

import logger from '../utils/logger';
import { runWithRetries } from '../utils/retryHandler';
import { callOpenRouterAPI, StreamingResponse } from '../integrations/openrouter'; // Assuming this will be implemented
import { OllamaService } from '../integrations/ollama'; // Assuming this will be implemented
import { LangChainService } from '../services/langchainService'; // Assuming this will be implemented

// --- Configuration ---
const AGENT_CONFIG = {
  // Default model settings as per user's request
  primaryModel: 'openrouter/google/gemini-2.5-flash-preview',
  fallbackModel: 'openrouter/meta-llama/llama-3.3-70b-instruct',
  backupModel: 'openrouter/deepseek/deepseek-chat-v3',
  requestTimeoutMs: 180000, // 3 minutes
  agentTimeoutMs: 300000, // 5 minutes
  retryAttempts: 5,
  exponentialBackoffFactor: 2, // Factor for exponential backoff
};

// --- Interfaces ---
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  model?: string; // To specify which model was used, or intended for
  toolCallId?: string; // For tool calls
}

export interface AgentResponse {
  message: string;
  modelUsed: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  streaming?: boolean; // Flag if the response is streaming
  status: 'success' | 'error' | 'timeout' | 'partial';
  errorDetails?: any;
  toolCalls?: any[]; // For future tool use
}

export interface AiAgentManagerOptions {
  defaultModel?: string;
  fallbackModel?: string;
  backupModel?: string;
  requestTimeoutMs?: number;
  agentTimeoutMs?: number;
  retryAttempts?: number;
  exponentialBackoffFactor?: number;
  useLocalAI?: boolean; // Flag to enable Ollama
  ollamaBaseUrl?: string;
  // Add other relevant options for integration management
}

// --- Agent Manager Class ---
export class AiAgentManager {
  private settings: Required<AiAgentManagerOptions>;
  private ollamaService: OllamaService | null = null;
  private langchainService: LangChainService | null = null; // For memory and more complex chains

  constructor(options: AiAgentManagerOptions = {}) {
    // Merge default configurations with provided options
    this.settings = {
      ...AGENTS_CORE_SETTINGS, // Assuming AGENTS_CORE_SETTINGS is defined elsewhere or we use AGENT_CONFIG
      ...options,
    };

    // Initialize Ollama if enabled
    if (this.settings.useLocalAI) {
      this.ollamaService = new OllamaService({
        baseUrl: this.settings.ollamaBaseUrl,
      });
      logger.info('Ollama service initialized.', { baseUrl: this.settings.ollamaBaseUrl });
    }

    // Initialize LangChain service (can be used for memory, agents, etc.)
    this.langchainService = new LangChainService(); // Initialize with default or provided settings
    logger.info('LangChain service initialized.');
  }

  /**
   * Processes a message through the AI pipeline, handling model selection, retries, and streaming.
   * @param history Array of agent messages representing the conversation history.
   * @param userMessage The latest user message.
   * @param streamingCallback Function to callback with streaming content.
   * @returns A promise resolving to the AgentResponse.
   */
  async processMessage(
    history: AgentMessage[],
    userMessage: string,
    streamingCallback?: (data: { partial: string; model: string }) => void
  ): Promise<AgentResponse> {
    const messages: AgentMessage[] = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    // Identify the model to use
    const modelToUse = this.getModelPreference();
    logger.debug('Determined model to use for processing.', { model: modelToUse, historyLength: history.length });

    // --- Task Execution Pipeline ---
    // This is a simplified version. A real pipeline would involve more steps:
    // 1. Prompt Engineering / Context Management (potentially via LangChain)
    // 2. Tool Selection / Function Calling (preparing for tool use)
    // 3. Model Call (OpenRouter or Ollama)
    // 4. Response Handling (streaming, error handling, retries)

    // Mocking the core AI call with retry logic
    try {
      const response = await runWithRetries(
        () => this.fetchAiResponse(messages, modelToUse, streamingCallback),
        {
          retries: this.settings.retryAttempts,
          delay: this.settings.requestTimeoutMs / this.settings.retryAttempts, // Distribute delay
          exponentialBackoff: true,
          factor: this.settings.exponentialBackoffFactor,
          context: { purpose: 'AI Message Processing', model: modelToUse },
        }
      );

      // Process the final response
      if (response.status === 'success' || response.status === 'partial') {
        logger.info('Successfully processed message.', { modelUsed: response.modelUsed, status: response.status });
        return response;
      } else {
        logger.error('Failed to process message after retries.', { status: response.status, errorDetails: response.errorDetails });
        // Fallback or re-throw if necessary
        return {
          message: 'An unexpected error occurred while processing your request.',
          modelUsed: modelToUse,
          status: 'error',
          errorDetails: response.errorDetails || 'Unknown processing error',
        };
      }
    } catch (error: any) {
      logger.error('Critical error during message processing.', {
        message: error.message,
        stack: error.stack,
        modelUsed: modelToUse,
      });
      return {
        message: 'An critical error prevented processing your request.',
        modelUsed: modelToUse,
        status: 'error',
        errorDetails: error.message || error,
      };
    }
  }

  /**
   * Determines the model to use based on preference and availability.
   * Includes logic for fallback and backup models.
   * @returns The selected model identifier.
   */
  private getModelPreference(): string {
    // In a more advanced system, this would check Ollama availability, model capabilities, etc.
    // For now, it simply prioritizes based on the configuration.
    return this.settings.defaultModel || AGENT_CONFIG.primaryModel;
  }

  /**
   * Fetches a response from the AI model. Handles streaming and basic error mapping.
   */
  private async fetchAiResponse(
    messages: AgentMessage[],
    model: string,
    streamingCallback?: (data: { partial: string; model: string }) => void
  ): Promise<AgentResponse> {
    try {
      // --- Model Call Logic ---
      // This section would decide whether to use OpenRouter or Ollama based on settings.

      let result: any; // Use 'any' for now, specific type depends on the provider's response structure

      if (this.settings.useLocalAI && this.ollamaService) {
        // Attempt to use Ollama first if enabled and available
        logger.debug('Attempting to use Ollama for response.', { model, messagesLength: messages.length });
        // Ensure messages are formatted correctly for Ollama if needed
        // Ollama might expect a different structure, e.g., just the prompt or structured history.
        // For simplicity, assuming messages can be stringified or passed as content.
        const promptContent = messages.map(m => `${m.role}: ${m.content}`).join('\n');

        // Check if Ollama supports streaming for the given model
        // Use 'streaming' option from OllamaService if implemented
        if (streamingCallback) {
          result = await this.ollamaService.streamChat(model, promptContent, {
            timeout: this.settings.requestTimeoutMs,
            // Add other required Ollama options
          });
          // If streaming, the callback handles the response piece by piece.
          // The main loop will then determine the final status.
          // For now, assume streaming means it's 'success' if it completes without error.

          // Awaiting the stream to finish and collecting final message
          let fullMessage = '';
          for await (const chunk of result) {
             // Assuming chunk has 'message' property that contains content
            if (chunk.message?.content) {
              fullMessage += chunk.message.content;
              streamingCallback({ partial: chunk.message.content, model });
            } else if (chunk.message) { // Handle cases where the structure might differ
              fullMessage += chunk.message;
              streamingCallback({ partial: chunk.message, model });
            }
          }

          return {
            message: fullMessage,
            modelUsed: model,
            streaming: true,
            status: 'success',
          };
        } else {
          // Non-streaming call to Ollama
          result = await this.ollamaService.chat(model, promptContent, {
            timeout: this.settings.requestTimeoutMs,
            // Add other required Ollama options
          });
          // Structure result based on Ollama's expected response format
          return {
            message: result.message?.content || result.message || 'No content received from Ollama',
            modelUsed: model,
            status: 'success',
          };
        }

      } else {
        // Use OpenRouter API
        logger.debug('Attempting to use OpenRouter for response.', { model, messagesLength: messages.length, timeout: this.settings.requestTimeoutMs });

        // NOTE: The callOpenRouterAPI needs to be implemented to handle streaming callback correctly
        // It should accept and utilize the streamingCallback function.
        const response = await callOpenRouterAPI({
          model: model,
          messages: messages,
          stream: !!streamingCallback, // Stream if callback is provided
          timeoutMs: this.settings.requestTimeoutMs,
          // Add other parameters like temperature, top_p, etc. if needed
        });

        if (streamingCallback && response instanceof StreamingResponse) {
          let fullMessage = '';
          for await (const chunk of response.stream) {
            if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0].delta?.content) {
              const content = chunk.choices[0].delta.content;
              fullMessage += content;
              streamingCallback({ partial: content, model });
            }
          }
          return {
            message: fullMessage,
            modelUsed: model,
            streaming: true,
            status: 'success',
          };
        } else if (response.choices && response.choices.length > 0 && response.choices[0].message?.content) {
          // Non-streaming response
          return {
            message: response.choices[0].message.content,
            modelUsed: model,
            status: 'success',
             // Add tokensUsed if available in the response
             tokensUsed: response.usage,
          };
        } else {
          // Handle cases where response format is unexpected or empty
          const errorContent = response.error?.message || JSON.stringify(response);
          logger.error('OpenRouter API returned an unexpected or empty response.', { model, response: errorContent });
          return {
            message: 'Received an unexpected response format from the AI model.',
            modelUsed: model,
            status: 'error',
            errorDetails: errorContent,
          };
        }
      }
    } catch (error: any) {
      // Handle specific errors (timeout, provider error, etc.)
      // TODO: Map errors to specific statuses (timeout, provider error, etc.)
      logger.error(`Error fetching AI response from ${model}`, {
        message: error.message,
        stack: error.stack,
        provider: this.settings.useLocalAI ? 'Ollama' : 'OpenRouter',
      });

      let status: AgentResponse['status'] = 'error';
      let errorMessage = 'An unknown error occurred.';

      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        status = 'timeout';
        errorMessage = 'The AI request timed out.';
      } else if (error.response?.status) {
        status = 'error';
        errorMessage = `Provider error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`;
      } else {
        errorMessage = error.message || 'An unexpected API error occurred.';
      }

      return {
        message: errorMessage,
        modelUsed: model,
        status: status,
        errorDetails: error,
      };
    }
  }

  // --- Future Enhancements and Placeholder Methods ---

  /**
   * Manages streaming responses from AI models.
   * This would handle chunking and sending to the client.
   */
  public async handleStreamingResponse(
    stream: AsyncIterable<any>, // Type depends on provider (e.g., OpenAI stream chunk)
    model: string,
    streamingCallback: (data: { partial: string; model: string }) => void
  ) {
    try {
      for await (const chunk of stream) {
        // Logic to extract content from the chunk
        // Example for OpenAI-ish format:
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          streamingCallback({ partial: content, model });
        }
      }
    } catch (error) {
      logger.error('Error during streaming response handling.', { model, error });
      // Optionally call streamingCallback with an error message or status
      streamingCallback({ partial: '[Streaming error occurred]', model });
    }
  }

  /**
   * Manages the task queue for background AI operations.
   */
  public async enqueueTask(task: AgentMessage[]): Promise<string> {
    // Implement task queue logic (e.g., using a library like BullMQ or a simple array with workers)
    const taskId = `task_${Date.now()}`;
    logger.info('Task enqueued.', { taskId, taskLength: task.length });
    // ... push task to queue ...
    return taskId;
  }

  /**
   * Orchestrates multi-agent communication.
   */
  public async orchestrateAgents(messages: AgentMessage[]): Promise<AgentResponse> {
    // Future implementation for coordinating multiple agents
    logger.debug('Orchestrating multi-agent communication.');
    // Example: route messages to different agents based on content or role
    return this.processMessage(messages.slice(0, -1), messages[messages.length - 1].content); // Basic fallback to single agent processing
  }

  /**
   * Manages conversation memory.
   */
  public async manageMemory(conversationHistory: AgentMessage[]): Promise<void> {
    // Integrate with LangChain or other memory systems
    if (this.langchainService) {
      await this.langchainService.saveConversation(conversationHistory);
    }
  }

  /**
   * Cleans up resources or terminates processes.
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up agent manager resources.');
    // e.g., close connections, terminate background workers
  }
}

// Example of defining core settings if not imported
const AGENTS_CORE_SETTINGS: Required<AiAgentManagerOptions> = {
  defaultModel: AGENT_CONFIG.primaryModel,
  fallbackModel: AGENT_CONFIG.fallbackModel,
  backupModel: AGENT_CONFIG.backupModel,
  requestTimeoutMs: AGENT_CONFIG.requestTimeoutMs,
  agentTimeoutMs: AGENT_CONFIG.agentTimeoutMs,
  retryAttempts: AGENT_CONFIG.retryAttempts,
  exponentialBackoffFactor: AGENT_CONFIG.exponentialBackoffFactor,
  useLocalAI: false, // Default to false, enable via constructor options
  ollamaBaseUrl: 'http://localhost:11434', // Default Ollama URL
};

export default AiAgentManager;
