import { BlockchainService } from "../../services/blockchain/blockchain.service.js";
import { sanitizeAddress, validateAddress } from "../../utils/address.js";
import { env } from "../../config/config.js";
import { redis } from "../../infra/redis.js";
import { FundMetrics } from "../../types/fund.js";

interface CachedMetrics {
  data: FundMetrics;
  timestamp: number;
}

export class FundService {
  private localCache: CachedMetrics | null = null;
  private blockchain = new BlockchainService();
  private balanceCache = new Map<
    string,
    { expires: number; balance: string }
  >();

  async processInvestment(investor: string, usdAmount: number) {
    return this.blockchain.invest(investor, usdAmount);
  }

  async processRedemption(investor: string, shares: bigint) {
    return this.blockchain.redeem(investor, shares);
  }

  async getBalance(investorAddress: string): Promise<string> {
    validateAddress(investorAddress);
    const address = sanitizeAddress(investorAddress);
    const cached = this.balanceCache.get(address);
    if (cached && cached.expires > Date.now()) return cached.balance;

    const balance = (await this.blockchain.getBalance(address)).toString();
    this.balanceCache.set(address, {
      balance,
      expires: Date.now() + 60_000, // 1 minute cache
    });
    return balance;
  }

  public getCacheStatus(): "fresh" | "stale" {
    if (!this.localCache) return "stale";
    const ttl = parseInt(env.METRICS_CACHE_TTL) * 1000; // Convert to milliseconds
    return Date.now() - this.localCache.timestamp < ttl ? "fresh" : "stale";
  }

  async getFundMetrics(refresh = false): Promise<FundMetrics> {
    const CACHE_KEY = "fund_metrics";
    const ttl = parseInt(env.METRICS_CACHE_TTL);
    const now = Date.now();

    // Try Redis first
    if (!refresh) {
      try {
        const cached = await redis.getJSON<CachedMetrics>(CACHE_KEY);
        if (cached && now - cached.timestamp < ttl * 1000) {
          return cached.data;
        }
      } catch (redisError) {
        console.error("Redis cache check failed:", redisError);
      }
    }

    // Fallback to local cache if within TTL
    if (this.localCache && now - this.localCache.timestamp < ttl * 1000) {
      return this.localCache.data;
    }

    // Fetch fresh data from blockchain
    try {
      const freshMetrics = await this.blockchain.getFundMetrics();
      const cacheData: CachedMetrics = {
        data: freshMetrics,
        timestamp: now,
      };

      // Update Redis
      try {
        await redis.setJSON(CACHE_KEY, cacheData, ttl);
      } catch (cacheError) {
        console.error("Redis cache update failed:", cacheError);
      }

      // Update local cache
      this.localCache = cacheData;

      return freshMetrics;
    } catch (error) {
      // Try to return stale cache if available
      if (this.localCache) {
        console.warn("Serving stale metrics due to error:", error);
        return this.localCache.data;
      }
      throw error;
    }
  }
}
