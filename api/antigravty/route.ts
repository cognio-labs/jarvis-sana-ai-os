// api/antigravty/route.ts

import { NextApiResponse, NextApiRequest } from 'next';
import logger from '../../utils/logger';
import AntigravtyService from '../../services/antigravty.service';
// Assuming AiAgentManager is not directly used here, but AntigravtyService orchestrates it.
// We'll instantiate AntigravtyService here.

// --- Global Service Instance ---
// For simplicity, instantiate AntigravtyService once. In a scalable app,
// this might be managed by a dependency injection container or a singleton pattern.
// IMPORTANT: This assumes AntigravtyService can be safely instantiated globally.
// If it manages state that needs to be request-scoped or re-initialized, adjust accordingly.
let antigravtyService: AntigravtyService | null = null;

const getAntigravtyService = (): AntigravtyService => {
  if (!antigravtyService) {
    logger.info('Initializing AntigravtyService instance for API route.');
    antigravtyService = new AntigravtyService();
    // TODO: Potentially load initial configurations or warm up models here if needed.
  }
  return antigravtyService;
};

// --- API Route Handler ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow only POST requests for sending messages
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // --- Environment & Security Checks ---
  // Basic API key check (placeholder - use a more robust system like middleware)
  // const apiKey = req.headers['x-api-key'];
  // if (apiKey !== process.env.API_KEY) {
  //   logger.warn('Unauthorized API access attempt.');
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  const { message, conversationId, enableStreaming } = req.body;

  if (!message) {
    logger.warn('API route received request with no message body.');
    return res.status(400).json({ message: 'Bad Request: Missing message content.' });
  }

  if (typeof message !== 'string') {
    logger.warn('API route received request with invalid message type.', { type: typeof message });
    return res.status(400).json({ message: 'Bad Request: Message content must be a string.' });
  }

  logger.info('Received API request to Antigravty sender.', { sender: 'API Route', message: message.substring(0, 100), conversationId, enableStreaming });

  const service = getAntigravtyService();
  let aiResponse;

  // Handle streaming requests
  if (enableStreaming) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush headers immediately

    const streamingCallback = (data: { partial: string; model: string }) => {
      const sseData = `data: ${JSON.stringify({ partial: data.partial, model: data.model })}\n\n`;
      res.write(sseData);
    };

    try {
      // Use conversationId if provided to maintain context
      aiResponse = await service.sendMessage(message, conversationId, streamingCallback);

      // Send final status and message after stream ends
      const finalSseData = `data: ${JSON.stringify({ ...aiResponse, status: aiResponse.status || 'success' })}\n\n`;
      res.write(finalSseData);
      res.end('event: end\ndata: {}\n\n'); // Signal end of stream
      logger.info('Streaming response sent successfully.', { conversationId, modelUsed: aiResponse.modelUsed });

    } catch (error: any) {
      logger.error('Error during streaming response handling in API route.', { error });
      // Send error message as SSE event
      const errorSseData = `data: ${JSON.stringify({ message: error.message || 'An error occurred during streaming.', status: 'error', errorDetails: error.details || error })}\n\n`;
      res.write(errorSseData);
      res.end(); // End the response stream
    }

  } else {
    // Handle non-streaming requests
    try {
      aiResponse = await service.sendMessage(message, conversationId);

      if (aiResponse.status === 'success' || aiResponse.status === 'partial') {
        res.status(200).json(aiResponse);
        logger.info('Non-streaming response sent successfully.', { conversationId, modelUsed: aiResponse.modelUsed });
      } else {
        // Map AI status to HTTP status codes
        let statusCode = 500;
        if (aiResponse.status === 'timeout') statusCode = 504; // Gateway Timeout
        else if (aiResponse.status === 'error') statusCode = 502; // Bad Gateway (provider error)

        res.status(statusCode).json(aiResponse);
        logger.warn('API route returned non-success status.', { status: aiResponse.status, message: aiResponse.message });
      }
    } catch (error: any) {
      logger.error('Error processing non-streaming request in API route.', { error });
      res.status(500).json({
        message: `Internal Server Error: ${error.message}`,
        status: 'error',
        errorDetails: error.details || error,
      });
    }
  }
}
