import { Redis } from "ioredis";
import { env } from "../config/config.js";
import { Logger } from "../utils/logger.js";

class RedisService {
  private client: Redis;
  private connectionState: "connected" | "disconnected" | "connecting";
  private readonly timeout: number;
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger("RedisService");
    this.connectionState = "disconnected";
    this.timeout = 5000;

    this.client = new Redis({
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on("connect", () => {
      this.connectionState = "connected";
      this.logger.info("Connection established");
    });

    this.client.on("error", (err) => {
      this.logger.error("Connection error", err, { state: this.connectionState });
      this.connectionState = "disconnected";
    });

    this.client.on("reconnecting", () => {
      this.connectionState = "connecting";
      this.logger.warn("Attempting reconnection");
    });
  }

  async connect(): Promise<void> {
    if (this.connectionState !== "connected") {
      this.connectionState = "connecting";
      this.logger.debug("Initiating connection");
      await this.client.connect();
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const pong = await Promise.race([
        this.client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => {
            const err = new Error("Health check timeout");
            this.logger.error(err.message, err, { timeout: this.timeout });
            reject(err);
          }, this.timeout)
        ),
      ]);
      return pong === "PONG";
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Health check failed", err);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connectionState = "disconnected";
    this.logger.info("Connection closed");
  }

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      this.logger.debug("Cache fetch", { key, hit: !!data });
      return data ? JSON.parse(data) : null;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Cache read error", err, { key });
      return null;
    }
  }

  async setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
      this.logger.debug("Cache store", { key, ttlSeconds });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Cache write error", err, { key, ttlSeconds });
    }
  }

  get status() {
    return this.connectionState;
  }
}

export const redis = new RedisService();