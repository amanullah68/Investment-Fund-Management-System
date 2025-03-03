import pgtools from "pgtools";
import { env } from "../config/config.js";
import { AppDataSource } from "./dataSource.js";
import { setTimeout } from "timers/promises";
import { Logger } from "../utils/logger.js";

const logger = new Logger("Database");

const MAX_RETRIES = 5;
const RETRY_DELAY = 6000;

export async function createDatabaseIfNotExist(): Promise<void> {
  const config = {
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    port: parseInt(env.POSTGRES_PORT),
    host: env.POSTGRES_HOST,
  };

  try {
    await pgtools.createdb(config, env.POSTGRES_DB);
    logger.info(`Database created successfully`, { database: env.POSTGRES_DB });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === "duplicate_database" || (err as any).code === "42P04") {
      logger.info(`Database already exists`, { database: env.POSTGRES_DB });
    } else {
      logger.error(`Database creation failed`, err, { database: env.POSTGRES_DB });
    }
  }
}

export async function connectDatabaseWithRetry() {
  if (AppDataSource.isInitialized) {
    logger.debug("Database already connected");
    return true;
  }

  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      await AppDataSource.initialize();
      logger.info("Connection established successfully");
      return true;
    } catch (error) {
      retryCount++;
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error("Connection attempt failed", err, {
        attempt: `${retryCount}/${MAX_RETRIES}`,
      });

      if (retryCount < MAX_RETRIES) {
        logger.warn(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
        await setTimeout(RETRY_DELAY);
      }
    }
  }

  const finalError = new Error("Maximum connection retries exceeded");
  logger.error("Database connection failed", finalError, { maxRetries: MAX_RETRIES });
  throw finalError;
}

export async function disconnectDatabase() {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info("Connection closed gracefully");
  }
}