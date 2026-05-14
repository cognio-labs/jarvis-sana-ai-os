// utils/logger.ts

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'jarvis-sana.log');

// Ensure the log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  VERBOSE = 'VERBOSE',
}

interface Logger {
  (level: LogLevel, message: string, context?: any): void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, context?: any) => void;
  debug: (message: string, context?: any) => void;
  verbose: (message: string, context?: any) => void;
}

const logger: Logger = (level, message, context) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}]: ${message}`;

  // Append to log file
  try {
    appendFileSync(LOG_FILE, `${logEntry}\n`);
  } catch {
    // non-fatal — log directory may not be writable at runtime
  }

  // Also log to console for real-time feedback
  // eslint-disable-next-line no-console -- Intentional: keep real-time logs while persisting to file.
  console.log(logEntry);

  if (context) {
    const contextString = JSON.stringify(context, null, 2);
    try {
      appendFileSync(LOG_FILE, `Context: ${contextString}\n`);
    } catch {
      // non-fatal
    }
    // eslint-disable-next-line no-console -- Intentional: keep real-time logs while persisting to file.
    console.log('Context:', contextString);
  }
};

// Add convenience methods
logger.info    = (message, context) => logger(LogLevel.INFO,    message, context);
logger.warn    = (message, context) => logger(LogLevel.WARN,    message, context);
logger.error   = (message, context) => logger(LogLevel.ERROR,   message, context);
logger.debug   = (message, context) => logger(LogLevel.DEBUG,   message, context);
logger.verbose = (message, context) => logger(LogLevel.VERBOSE, message, context);

export default logger;
