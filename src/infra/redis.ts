// src/infra/redis.ts
import { Redis } from "ioredis";
import { env } from "../config/config.js";

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }

  async connect() {
    if (this.client.status !== "ready") {
      await this.client.connect();
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJSON(key: string, value: any, ttlSeconds: number) {
    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async disconnect() {
    await this.client.quit();
  }
}

export const redis = new RedisService();
