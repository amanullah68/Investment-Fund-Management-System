// src/utils/logger.ts
import winston from "winston";
import { env } from "../config/config.js";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// Create logs directory if it doesn't exist
const logDir = "logs";
if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // File transports
    new winston.transports.File({
      filename: join(logDir, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 7
    }),
    new winston.transports.File({
      filename: join(logDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 14
    })
  ]
});

// Add console transport in non-production environments
if (env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Custom logger interface
export class Logger {
  private context: string;

  constructor(context: string = "Application") {
    this.context = context;
  }

  debug(message: string, meta?: object) {
    logger.debug(message, { ...meta, context: this.context });
  }

  info(message: string, meta?: object) {
    logger.info(message, { ...meta, context: this.context });
  }

  warn(message: string, meta?: object) {
    logger.warn(message, { ...meta, context: this.context });
  }

  error(message: string, error: Error, meta?: object) {
    logger.error(message, { 
      ...meta,
      context: this.context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
}

// Default application logger
export const appLogger = new Logger();