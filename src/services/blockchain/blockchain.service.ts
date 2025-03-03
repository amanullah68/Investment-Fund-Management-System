import { ethers } from "ethers";
import { FundTokenABI } from "./contractABI.js";
import { env } from "../../config/config.js";
import { sanitizeAddress } from "../../utils/address.js";
import { FundMetrics } from "../../types/fund.type.js";
import { HttpError } from "../../errors/http.error.js";
import { Logger } from "../../utils/logger.js";

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;
  private isConnecting = false;
  private readonly logger = new Logger("BlockchainService");
  private retryInterval = 1000;
  private maxRetryInterval = 30000;
  private connectionAttempts = 0;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.logger.info("Initializing blockchain service", {
      rpcUrl: env.RPC_URL,
      contractAddress: env.CONTRACT_ADDRESS,
    });

    this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
    this.signer = new ethers.Wallet(env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      env.CONTRACT_ADDRESS,
      FundTokenABI,
      this.signer
    );

    this.initializeConnection().catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error("Initial connection attempt failed", error);
    });
  }

  private async initializeConnection() {
    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      this.logger.info("Attempting blockchain connection", {
        attempt: this.connectionAttempts,
      });

      await this.connect();
      this.logger.info("Blockchain connection established", {
        network: await this.provider.getNetwork(),
      });
      this.retryInterval = 1000; // Reset retry interval on success
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Connection attempt failed", err, {
        attempt: this.connectionAttempts,
        retryInterval: this.retryInterval,
      });
      this.scheduleRetry();
    } finally {
      this.isConnecting = false;
    }
  }

  private async connect() {
    this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
    this.signer = new ethers.Wallet(env.PRIVATE_KEY, this.provider);

    // Verify network connection
    const network = await this.provider.getNetwork();
    this.logger.debug("Network verification successful", {
      chainId: network.chainId,
      name: network.name,
    });

    this.contract = new ethers.Contract(
      env.CONTRACT_ADDRESS,
      FundTokenABI,
      this.signer
    );

    // Verify contract connection
    await this.contract.getFundMetrics();
    this.logger.debug("Contract connection verified");
  }

  destroy() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.provider && typeof this.provider.destroy === "function") {
      this.provider.destroy();
    }
    this.logger.info("Blockchain service resources cleaned up");
  }

  private scheduleRetry() {
    if (this.retryInterval <= this.maxRetryInterval) {
      this.logger.warn("Scheduling connection retry", {
        retryIn: `${this.retryInterval / 1000}s`,
        nextAttempt: this.connectionAttempts + 1,
      });

      setTimeout(() => {
        this.initializeConnection();
        this.retryInterval = Math.min(
          this.retryInterval * 2,
          this.maxRetryInterval
        );
      }, this.retryInterval);
    }
  }

  private async ensureConnected() {
    if (!this.provider || !this.signer || !this.contract) {
      if (!this.isConnecting) {
        await this.initializeConnection();
      }
      throw new HttpError("Blockchain connection not established", 503);
    }
  }

  async invest(
    investorAddress: string,
    usdAmount: number
  ): Promise<{ status: string; txHash: string }> {
    try {
      await this.ensureConnected();
      const address = sanitizeAddress(investorAddress);
      const amountWei = ethers.parseUnits(usdAmount.toFixed(6), 6);

      this.logger.info("Initiating investment transaction", {
        investor: address,
        usdAmount,
        amountWei: amountWei.toString(),
      });

      const tx = await this.contract.invest(address, amountWei);
      this.logger.info("Transaction sent", { txHash: tx.hash });

      const receipt = await tx.wait();
      this.logger.info("Transaction confirmed", {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      });

      return {
        status: receipt.status === 1 ? "success" : "failure",
        txHash: tx.hash,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const txHash =
        err instanceof ethers.ContractTransactionResponse
          ? err.hash
          : "unknown";

      this.logger.error("Investment transaction failed", err, {
        investorAddress,
        usdAmount,
        txHash,
      });

      return {
        status: "failure",
        txHash,
      };
    }
  }

  async redeem(
    investorAddress: string,
    shares: bigint
  ): Promise<{ status: string; txHash: string }> {
    try {
      await this.ensureConnected();
      const address = sanitizeAddress(investorAddress);

      this.logger.info("Checking investor balance", { investor: address });
      const balance = await this.contract.balanceOf(address);

      if (balance < shares) {
        const insufficientError = "Insufficient balance for redemption";
        const isError = new Error(insufficientError);
        this.logger.error(insufficientError, isError, {
          investor: address,
          requested: shares.toString(),
          available: balance.toString(),
        });
        throw new HttpError(
          `Insufficient balance: ${balance.toString()} shares available`,
          409
        );
      }

      this.logger.info("Initiating redemption transaction", {
        investor: address,
        shares: shares.toString(),
      });

      const tx = await this.contract.redeem(address, shares);
      this.logger.info("Redemption transaction sent", { txHash: tx.hash });

      const receipt = await tx.wait();
      this.logger.info("Redemption transaction confirmed", {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      });

      return {
        status: receipt.status === 1 ? "success" : "failure",
        txHash: tx.hash,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const txHash =
        err instanceof ethers.ContractTransactionResponse
          ? err.hash
          : "unknown";

      this.logger.error("Redemption transaction failed", err, {
        investorAddress,
        shares: shares.toString(),
        txHash,
      });

      return {
        status: "failure",
        txHash,
      };
    }
  }

  async getBalance(investorAddress: string): Promise<string> {
    try {
      await this.ensureConnected();
      this.logger.debug("Fetching balance", { investorAddress });

      const balance = await this.contract.balanceOf(investorAddress);
      this.logger.info("Balance retrieved", {
        investorAddress,
        balance: balance.toString(),
      });

      return balance.toString();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Balance check failed", err, { investorAddress });
      throw new HttpError("Failed to retrieve balance", 500);
    }
  }

  async getFundMetrics(): Promise<FundMetrics> {
    try {
      await this.ensureConnected();
      this.logger.debug("Fetching fund metrics");

      const metrics = await this.contract.getFundMetrics();
      this.logger.info("Fund metrics retrieved", {
        totalAssetValue: metrics.totalAssetValue.toString(),
        sharesSupply: metrics.sharesSupply.toString(),
      });

      return {
        totalAssetValue: metrics.totalAssetValue,
        sharesSupply: metrics.sharesSupply,
        lastUpdateTime: metrics.lastUpdateTime,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to fetch fund metrics", err);
      throw new HttpError("Failed to fetch fund metrics", 500);
    }
  }
}
