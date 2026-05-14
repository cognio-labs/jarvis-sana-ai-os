// src/pages/api/socket.io.ts
import type { Server as HttpServer } from 'http';
import { Server, Socket as SocketIOSocket } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@utils/logger';

// Basic Socket.IO setup for Next.js API route
// Note: This approach might need adjustments based on Next.js version and deployment strategy.
// A more robust setup might involve a dedicated server or using Next.js RequestHandler.

// Global WebSocket server instance to be shared across requests or managed via a singleton
let io: Server | null = null;

type SocketApiResponse = NextApiResponse & {
  socket: NextApiResponse['socket'] & {
    server: HttpServer;
  };
};

const SocketHandler = (req: NextApiRequest, res: SocketApiResponse) => {
  if (!io) {
    logger.info('Initializing Socket.IO server...');
    const httpServer = res.socket.server;
    if (!httpServer) {
      logger.error('HTTP server not found for Socket.IO initialization.');
      return res.status(500).send('Socket.IO initialization failed: HTTP server not found.');
    }

    io = new Server(httpServer, {
      path: '/api/socket.io', // Custom path for Socket.IO server
      pingInterval: 10000, // Maintain connection
      pingTimeout: 5000,
      // Add other Socket.IO options here
      // e.g., cors: { origin: "*", methods: ["GET", "POST"] }
    });

    io.on('connection', (socket: SocketIOSocket) => {
      logger.info(`A client connected to Socket.IO: ${socket.id}`);

      // Example: Forward agent messages to connected clients
      // You would typically want to subscribe to events from your backend services
      // and then broadcast those events to the relevant clients.
      // e.g., agentManager.on('message', (data) => io.emit('agentMessage', data));

      socket.on('disconnect', () => {
        logger.info(`Client disconnected from Socket.IO: ${socket.id}`);
      });

      // Handle custom events from clients
      socket.on('subscribeToLogs', () => {
        logger.debug(`Client ${socket.id} subscribed to live logs.`);
        // Logic to start sending logs to this client
        // This might involve setting up a log stream handler
      });

      socket.on('sendMessageToAgent', (data) => {
        // Forward message to the backend agent system
        logger.debug(`Received sendMessageToAgent from ${socket.id}:`, data);
        // Example: Backed service would listen for this event or be called directly
        // agentManager.processMessage(data.message, data.conversationId);
        // You'd likely send the response back via io.to(socket.id).emit(...) or io.emit(...)
      });
    });

    logger.info('Socket.IO server initialized successfully.');
  }

  res.status(200).json({ message: 'Socket.IO server is running.' });
};

export default SocketHandler;

// Helper function to get the Socket.IO server instance
export const getSocketIO = (): Server | null => {
  return io;
};
