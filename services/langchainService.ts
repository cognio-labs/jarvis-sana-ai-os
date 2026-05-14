// services/langchainService.ts

import { ChatOpenAI } from '@langchain/openai'; // For OpenAI-compatible models (incl. OpenRouter, Ollama)
import { AIMessage, ChatMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import logger from '../utils/logger';

// TODO: Implement ChromaDB integration for vector memory
// import { Chroma } from '@langchain/community/vectorstores/chroma';
// import { OpenAIEmbeddings } from '@langchain/openai';

interface LangChainServiceOptions {
  memoryStoreUrl?: string; // URL for vector database like ChromaDB
  openAIApiKey?: string; // If not using default env var
  ollamaBaseUrl?: string; // For connecting to local Ollama instance
  modelName?: string; // Default model for LangChain
}

export class LangChainService {
  private chatModel: ChatOpenAI;
  private memory: BufferMemory;
  private conversationChain: ConversationChain;
  private defaultMemoryStoreUrl: string | undefined;

  constructor(options: LangChainServiceOptions = {}) {
    // --- Model Configuration ---
    // Prioritize local Ollama if available, then fallback to OpenRouter/OpenAI compatible APIs.
    // This requires careful configuration of environment variables.
    const models = {
      // Default models (can be overridden by options)
      default: process.env.LANGCHAIN_DEFAULT_MODEL || 'openrouter/google/gemini-2.5-flash-preview',
      openAIApiKey: options.openAIApiKey || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY, // Fallback to OpenRouter key
      ollamaBaseUrl: options.ollamaBaseUrl || process.env.OLLAMA_BASE_URL,
    };

    // Determine which API to use based on availability and config
    let modelProvider = models.default;
    let providerOptions: any = {};

    if (models.ollamaBaseUrl) {
      // If Ollama base URL is provided, configure ChatOpenAI to use it.
      // NOTE: LangChain's ChatOpenAI can be configured to point to Ollama via `configuration.baseURL`.
      // For this to work, Ollama needs to expose an OpenAI-compatible API endpoint or use a proxy.
      // If Ollama is not serving OpenAI-compatible API, a different LangChain model like `ChatOllama` would be needed.
      // Assuming for now that `ChatOpenAI` can be configured to point to Ollama's OpenAI-compatible endpoint.
      providerOptions.configuration = {
        baseURL: models.ollamaBaseUrl + '/v1', // Assuming Ollama runs an OpenAI-compatible server at /v1
      };
      logger.info('Configuring LangChain to use local Ollama via OpenAI compatible endpoint.', { ollamaBaseUrl: models.ollamaBaseUrl });
    } else if (models.openAIApiKey) {
      // Use OpenAI/OpenRouter API with the provided key
      providerOptions.apiKey = models.openAIApiKey;
      logger.info('Configuring LangChain to use OpenAI/OpenRouter API.', { model: modelProvider });
    } else {
      logger.warn('LangChain model key or Ollama URL not configured. Falling back to default model without explicit configuration.');
      // Falls back to whatever default `ChatOpenAI` resolves if key is missing. May fail.
    }
    
    // Override model name if specified in options
    const modelToUse = options.modelName || modelProvider;

    this.chatModel = new ChatOpenAI({
      modelName: modelToUse,
      ...providerOptions,
      // Add other common options like temperature, streaming, etc.
      // Streaming is handled by the AgentManager, but can be set here too.
      // streaming: true, // Enable if LangChain should manage streaming itself
    });

    // --- Memory Configuration ---
    // Default memory uses BufferMemory for in-memory conversation history within a session.
    // For persistent or vector memory, `options.memoryStoreUrl` would be used.
    // Example with ChromaDB memory setup:
    // if (options.memoryStoreUrl) {
    //   this.memory = new VectorMemory(...); // Configure vector memory
    // } else { ... }
    this.memory = new BufferMemory({
      chatHistory: new ChatMessageHistory(), // Simple in-memory history
      returnMessages: true, // Return messages for easier processing
      memoryKey: 'chat_history', // Key used in the prompt
    });
    this.defaultMemoryStoreUrl = options.memoryStoreUrl;

    // --- Conversation Chain Setup ---
    const defaultPrompt = PromptTemplate.fromTemplate(
      `The following is a friendly conversation between a human and an AI. The AI is talkative and provides specific details from its context. If AI does not know the answer to a question, it truthfully says that it does not know.

      Current conversation:
      {chat_history}
      Human: {input}
      AI:`
    );

    this.conversationChain = new ConversationChain({
      llm: this.chatModel,
      memory: this.memory,
      prompt: defaultPrompt,
    });

    logger.info('LangChainService initialized with memory and default prompt.', {
      model: modelToUse,
      memoryType: options.memoryStoreUrl ? 'Vector Store' : 'Buffer Memory',
    });
  }

  /**
   * Loads conversation history from a persistent store (e.g., ChromaDB).
   * @param conversationId The ID of the conversation to load.
   * @returns A promise resolving to an array of Langchain messages.
   */
  public async loadConversation(conversationId: string): Promise<ChatMessage[]> {
    logger.debug('Attempting to load conversation history.', { conversationId });
    // Placeholder for loading from Vector DB or other persistent storage.
    // This would involve querying the vector store based on conversationId.
    // For now, we'll return an empty history, as BufferMemory is completely in-memory.
    // In a production scenario, this method would fetch data from `this.defaultMemoryStoreUrl`.

    // Example if using ChromaDB (requires full setup):
    // if (this.defaultMemoryStoreUrl) {
    //   // Initialize Chroma client (ensure it's configured properly)
    //   // const vectorStore = await Chroma.fromExistingCollection(...)
    //   // const searchResults = await vectorStore.similaritySearch(query, ...)
    //   // Convert search results into LangChain messages
    //   // ...
    // }

    logger.warn(`Loading conversation history from persistent store is not fully implemented. Returning empty history for conversation ID: ${conversationId}`);
    return []; // Return empty array if not implemented or no history found
  }

  /**
   * Saves conversation history to a persistent store.
   * @param messages An array of Langchain ChatMessage objects.
   * @param conversationId The ID of the conversation to save.
   */
  public async saveConversation(messages: ChatMessage[], conversationId?: string): Promise<void> {
    logger.debug('Attempting to save conversation history.', { conversationId, messageCount: messages.length });
    // Placeholder for saving to Vector DB or other persistent storage.
    // If `conversationId` is provided, associate messages with it.
    // This would typically involve clearing old history and adding new messages,
    // possibly with embeddings if using a vector store.

    // For BufferMemory, we update the internal history.
    // This method is more about persisting it externally.
    if (this.memory instanceof BufferMemory && messages.length > 0) {
      // Clear existing in-memory messages for this step, then add new ones.
      // This is a simplified approach; real persistence needs more logic.
      this.memory.chatHistory = new ChatMessageHistory(); // Reset in-memory history
      for (const msg of messages) {
        this.memory.chatHistory.addMessage(msg); // Add serialized messages
      }
      logger.debug('Updated in-memory BufferMemory history.', { conversationId });
    }

    // If using vector memory, this is where you'd interact with the vector DB.
    // Example: Parse LangChain messages into text, embed them, and save to ChromaDB.
    // await Chroma.addDocuments(...);

    logger.warn(`Saving conversation history to persistent store is not fully implemented for conversation ID: ${conversationId}`);
  }

  /**
   * Processes a single user message through the configured LangChain chain.
   * @param userInput The user's input string.
   * @param history Optional existing conversation history as Langchain messages.
   * @returns A promise resolving to the AI's response message.
   */
  public async processUserInput(
    userInput: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    logger.debug('Processing user input via LangChain chain.', { userInput, historyLength: history.length });

    // If history was passed, ensure it's loaded into memory
    if (history.length > 0) {
      this.memory.chatHistory = new ChatMessageHistory(history);
    }

    try {
      const response = await this.conversationChain.invoke({ input: userInput });
      const aiMessageContent = response.response?.toString() || ''; // Assuming response format is { response: string }

      // Update memory with the latest exchange if not already handled by saveConversation
      // This is often implicitly handled by the chain, but explicit save might be needed.
      // await this.saveConversation(
      //   [...history, new HumanMessage(userInput), new AIMessage(aiMessageContent)],
      //   'default_conversation' // Or an actual conversation ID
      // );

      logger.info('LangChain chain processed input successfully.', { userInput, response: aiMessageContent.substring(0, 100) });
      return aiMessageContent;
    } catch (error: any) {
      logger.error('Error processing user input with LangChain chain.', { userInput, error });
      throw new Error(`LangChain processing failed: ${error.message}`);
    }
  }
}

export default LangChainService;
