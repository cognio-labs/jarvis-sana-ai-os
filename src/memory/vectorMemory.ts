// src/memory/vectorMemory.ts

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai'; // Assumes OpenAI embeddings, can be replaced with Ollama embeddings
import logger from '@utils/logger';
import { Document } from '@langchain/core/documents';

// --- Configuration ---
// Load from environment variables or provide defaults
const CHROMA_DB_URL = process.env.MEMORY_STORE_URL || 'http://localhost:8000'; // Default ChromaDB URL
const COLLECTION_NAME = 'jarvis_sana_memory';

// Embeddings model - can use OpenAI or Ollama based on agent settings
// For simplicity, using OpenAI Embeddings here. For Ollama, use `OllamaEmbeddings`.
// Ensure OPENAI_API_KEY is set if using OpenAIEmbeddings.
const embeddingsModel = new OpenAIEmbeddings({
  // apiKey: process.env.OPENAI_API_KEY, // Or OPENROUTER_API_KEY if using OpenRouter for embeddings
  // configuration: {
  //   baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined, // Example for OpenRouter embeddings
  // },
});

export class VectorMemoryManager {
  private vectorStore: Chroma | null = null;
  private collectionName: string;

  constructor(collectionName: string = COLLECTION_NAME) {
    this.collectionName = collectionName;
    logger.info('VectorMemoryManager initialized.', { chromaUrl: CHROMA_DB_URL, collectionName });
  }

  /**
   * Initializes the connection to the vector store.
   * Should be called before any other operations.
   */
  public async initialize(): Promise<void> {
    if (this.vectorStore) {
      logger.debug('Vector store already initialized.');
      return;
    }
    try {
      logger.info('Connecting to ChromaDB vector store...');
      this.vectorStore = await Chroma.fromExistingCollection(embeddingsModel, {
        collectionName: this.collectionName,
        url: CHROMA_DB_URL,
      });
      logger.info('Successfully connected to ChromaDB collection.', { collectionName: this.collectionName });
    } catch (error: any) {
      logger.error('Failed to initialize VectorMemoryManager. Could not connect to ChromaDB or collection.', {
        url: CHROMA_DB_URL,
        collectionName: this.collectionName,
        message: error.message,
        details: error.details || error,
      });
      // Depending on requirements, you might want to throw or attempt to create the collection
      // For now, we log the error and set vectorStore to null, operations will fail later.
    }
  }

  /**
   * Adds documents to the vector store.
   * @param docs Array of Document objects to add.
   */
  public async addDocuments(docs: Document[]): Promise<void> {
    if (!this.vectorStore) {
      logger.error('Vector store not initialized. Cannot add documents.');
      // Optionally attempt to initialize here or throw an error.
      // await this.initialize(); // Uncomment to attempt re-initialization
      throw new Error('Vector store not initialized.');
    }
    if (!docs || docs.length === 0) {
      logger.warn('No documents provided to add.');
      return;
    }
    try {
      await this.vectorStore.addDocuments(docs);
      logger.info(`Successfully added ${docs.length} documents to collection.`, { collectionName: this.collectionName });
    } catch (error: any) {
      logger.error('Failed to add documents to vector store.', {
        collectionName: this.collectionName,
        message: error.message,
        details: error.details || error,
      });
      throw error;
    }
  }

  /**
   * Searches the vector store for relevant documents based on a query.
   * @param query The search query string.
   * @param k The number of documents to retrieve.
   * @returns A promise resolving to an array of relevant Document objects.
   */
  public async search(query: string, k: number = 4): Promise<Document[]> {
    if (!this.vectorStore) {
      logger.error('Vector store not initialized. Cannot perform search.');
      throw new Error('Vector store not initialized.');
    }
    try {
      const results = await this.vectorStore.similaritySearch(query, k);
      logger.debug(`Search query "${query}" returned ${results.length} results.`, { k, collectionName: this.collectionName });
      return results;
    } catch (error: any) {
      logger.error('Failed to perform search in vector store.', {
        query,
        k,
        collectionName: this.collectionName,
        message: error.message,
        details: error.details || error,
      });
      throw error;
    }
  }

  /**
   * Clears all data from the collection. Use with caution.
   */
  public async clearCollection(): Promise<void> {
    if (!this.vectorStore) {
      logger.error('Vector store not initialized. Cannot clear collection.');
      throw new Error('Vector store not initialized.');
    }
    try {
      // ChromaDB doesn't directly offer a 'clear' method on the collection object itself after creation.
      // You might need to delete and recreate the collection, or use Chroma's admin APIs if available.
      // For simplicity, this is a placeholder. A real implementation might involve index management.
      logger.warn('clearCollection is a placeholder. Real implementation may require deleting and recreating the collection.');
      // Example: await this.vectorStore.deleteCollection(); // If such a method existed
      // await this.initialize(); // Then re-initialize
    } catch (error: any) {
      logger.error('Failed to clear vector store collection.', {
        collectionName: this.collectionName,
        message: error.message,
      });
      throw error;
    }
  }

  // Add other methods as needed: updateDocuments, deleteDocuments, etc.
}

// Example initializer that automatically initializes on module load
// This ensures the connection is ready when the service is first used.
// Note: This assumes ChromaDB is running and accessible at the default URL.
// You might want to make initialization more explicit or conditional based on application needs.
const initializeMemoryManager = async () => {
  const memoryManager = new VectorMemoryManager();
  await memoryManager.initialize();
  return memoryManager;
};

// Export a singleton instance or a factory function
export const memoryManager = new VectorMemoryManager(); // Create a singleton instance
initializeMemoryManager().catch(err => {
  logger.error('Error during automatic VectorMemoryManager initialization.', err);
});
