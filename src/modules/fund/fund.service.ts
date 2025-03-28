import { BlockchainService } from "../../services/blockchain/blockchain.service.js";
import { sanitizeAddress } from "../../utils/address.js";
import { env } from "../../config/config.js";
import { redis } from "../../infra/redis.service.js";
import { FundMetrics } from "../../types/fund.type.js";
import { Logger } from "../../utils/logger.js";
import { serializeBigInts } from "../../utils/serialization.util.js";

interface CachedMetrics {
  data: FundMetrics;
  timestamp: number;
}

export class FundService {
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

  async getFundMetrics(refresh = false): Promise<FundMetrics> {
    const CACHE_KEY = "fund_metrics";
    const ttl = parseInt(env.METRICS_CACHE_TTL);
    const now = Date.now();

    if (!refresh) {
      try {
        const cached = await redis.getJSON<CachedMetrics>(CACHE_KEY);
        if (cached) {
          const age = now - cached.timestamp;
          if (age < ttl * 1000) {
            this.logger.info("✅ Cache hit - Using Redis metrics", { age });
            return cached.data;
          } else {
            this.logger.info("⏱️ Cache stale - Fetching new data", {
              age,
              ttl,
            });
          }
        } else {
          this.logger.info("❌ No Redis cache found");
        }
      } catch (error) {
        this.logger.error("Redis cache check failed", error as Error, {
          CACHE_KEY,
        });
      }
    }

    try {
      this.logger.info("Fetching fresh fund metrics");
      const freshMetrics = await this.blockchain.getFundMetrics();
      const cacheData: CachedMetrics = {
        data: freshMetrics,
        timestamp: Date.now(),
      };

      try {
        const serialized = serializeBigInts(cacheData);
        await redis.setJSON(CACHE_KEY, serialized, ttl);
        this.logger.info("Updated Redis cache", { CACHE_KEY, ttl });
      } catch (error) {
        this.logger.error("Redis cache update failed", error as Error, {
          CACHE_KEY,
        });
      }

      return freshMetrics;
    } catch (error) {
      this.logger.error(
        "Metrics fetch failed with no stale data available",
        error as Error
      );
      throw error;
    }
  }
}
