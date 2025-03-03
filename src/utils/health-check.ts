import { AppDataSource } from "../database/dataSource.js";
import { redis } from "../infra/redis.service.js";
import { ethers } from "ethers";
import { env } from "../config/config.js";

const RPC_TIMEOUT = 5000; // 5 seconds

class HealthService {
  private rpcProvider: ethers.JsonRpcProvider;

  constructor() {
    this.rpcProvider = new ethers.JsonRpcProvider(env.RPC_URL);
  }

  async checkPostgres(): Promise<boolean> {
    try {
      await AppDataSource.query("SELECT 1");
      return true;
    } catch (error) {
      console.error("PostgreSQL health check failed:", error);
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    return redis.checkHealth();
  }

  async checkRpc(): Promise<boolean> {
    try {
      await Promise.race([
        this.rpcProvider.getBlockNumber(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), RPC_TIMEOUT)
        ),
      ]);
      return true;
    } catch (error) {
      console.error("RPC health check failed:", error);
      return false;
    }
  }

  async getHealthStatus() {
    const [postgres, redis, rpc] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkRpc(),
    ]);

    return {
      status: postgres && redis && rpc ? "OK" : "DEGRADED",
      services: {
        postgres,
        redis,
        rpc,
      },
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  }
}

export const healthService = new HealthService();
