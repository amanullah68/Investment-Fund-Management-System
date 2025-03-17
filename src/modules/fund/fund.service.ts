import { BlockchainService } from "../../services/blockchain/blockchain.service.js";
import { sanitizeAddress } from "../../utils/address.js";
import { env } from "../../config/config.js";
import { redis } from "../../infra/redis.service.js";
import { FundMetrics } from "../../types/fund.type.js";
import { Logger } from "../../utils/logger.js";

interface CachedMetrics {
  data: FundMetrics;
  timestamp: number;
}

export class FundService {
  private localCache: CachedMetrics | null = null;
  private blockchain = new BlockchainService();
  private logger = new Logger("FundService");

  async processInvestment(investor: string, usdAmount: number) {
    this.logger.info("Processing investment", { investor, usdAmount });
    return this.blockchain.invest(investor, usdAmount);
  }

  async processRedemption(investor: string, shares: bigint) {
    this.logger.info("Processing redemption", {
      investor,
      shares: shares.toString(),
    });
    return this.blockchain.redeem(investor, shares);
  }

  async getBalance(investorAddress: string): Promise<string> {
    try {
      const address = sanitizeAddress(investorAddress);
      this.logger.debug("Fetching balance", { address });

      const balance = (await this.blockchain.getBalance(address)).toString();
      this.logger.info("Balance retrieved", { address, balance });

      return balance;
    } catch (error) {
      this.logger.error("Balance check failed", error as Error, {
        investorAddress,
      });
      throw error;
    }
  }

  public getCacheStatus(): "fresh" | "stale" {
    const status =
      this.localCache &&
      Date.now() - this.localCache.timestamp <
        parseInt(env.METRICS_CACHE_TTL) * 1000
        ? "fresh"
        : "stale";
    this.logger.debug("Cache status checked", { status });
    return status;
  }

  async getFundMetrics(refresh = false): Promise<FundMetrics> {
    const CACHE_KEY = "fund_metrics";
    const ttl = parseInt(env.METRICS_CACHE_TTL);
    const now = Date.now();

    if (!refresh) {
      try {
        const cached = await redis.getJSON<CachedMetrics>(CACHE_KEY);
        if (cached && now - cached.timestamp < ttl * 1000) {
          this.logger.info("Cache hit - Using Redis metrics", {
            age: now - cached.timestamp,
            ttl,
          });
          return cached.data;
        }
      } catch (error) {
        this.logger.error("Redis cache check failed", error as Error, {
          CACHE_KEY,
        });
      }
    }

    if (this.localCache && now - this.localCache.timestamp < ttl * 1000) {
      this.logger.info("Cache hit - Using local metrics", {
        age: now - this.localCache.timestamp,
        ttl,
      });
      return this.localCache.data;
    }

    try {
      this.logger.info("Fetching fresh fund metrics");
      const freshMetrics = await this.blockchain.getFundMetrics();
      const cacheData: CachedMetrics = { data: freshMetrics, timestamp: now };

      try {
        await redis.setJSON(CACHE_KEY, cacheData, ttl);
        this.logger.info("Updated Redis cache", { CACHE_KEY, ttl });
      } catch (error) {
        this.logger.error("Redis cache update failed", error as Error, {
          CACHE_KEY,
        });
      }

      this.localCache = cacheData;
      this.logger.info("Updated local cache", { timestamp: now });

      return freshMetrics;
    } catch (error) {
      if (this.localCache) {
        this.logger.warn("Falling back to stale metrics", {
          error: error as Error,
          staleAge: now - this.localCache.timestamp,
        });
        return this.localCache.data;
      }
      this.logger.error(
        "Metrics fetch failed with no stale data available",
        error as Error
      );
      throw error;
    }
  }
}
