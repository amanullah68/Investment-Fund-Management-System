import { ethers } from "ethers";
import { FundTokenABI } from "./contractABI.js";
import { env } from "../../config/config.js";
import { sanitizeAddress } from "../../utils/address.js";
import { FundMetrics } from "../../types/fund.type.js";
import { HttpError } from "../../errors/http.error.js";

export class BlockchainService {
  readonly provider: ethers.JsonRpcProvider;
  readonly signer: ethers.Wallet;
  readonly contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
    this.signer = new ethers.Wallet(env.PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      env.CONTRACT_ADDRESS,
      FundTokenABI,
      this.signer
    );
  }

  async invest(
    investorAddress: string,
    usdAmount: number
  ): Promise<{ status: string; txHash: string }> {
    const address = sanitizeAddress(investorAddress);
    const amountWei = ethers.parseUnits(usdAmount.toFixed(6), 6);

    try {
      const tx = await this.contract.invest(address, amountWei);
      const receipt = await tx.wait();

      // Check the receipt status (1 means success, 0 indicates failure)
      if (receipt.status === 1) {
        return { status: "success", txHash: tx.hash };
      } else {
        return { status: "failure", txHash: tx.hash };
      }
    } catch (error: any) {
      const txHash = error?.tx?.hash || "unknown";
      return { status: "failure", txHash };
    }
  }

  async redeem(
    investorAddress: string,
    shares: bigint
  ): Promise<{ status: string; txHash: string }> {
    const address = sanitizeAddress(investorAddress);
    const balance = await this.contract.balanceOf(address);

    if (balance < shares) {
      throw new HttpError(
        `Insufficient balance: ${balance.toString()} shares available`,
        409
      );
    }

    try {
      const tx = await this.contract.redeem(address, shares);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        return { status: "success", txHash: tx.hash };
      } else {
        return { status: "failure", txHash: tx.hash };
      }
    } catch (error: any) {
      const txHash = error?.tx?.hash || "unknown";
      return { status: "failure", txHash };
    }
  }

  async getBalance(investorAddress: string): Promise<string> {
    const balance = await this.contract.balanceOf(investorAddress);
    return balance.toString();
  }

  async getFundMetrics(): Promise<FundMetrics> {
    try {
      const metrics = await this.contract.getFundMetrics();

      return {
        totalAssetValue: metrics.totalAssetValue,
        sharesSupply: metrics.sharesSupply,
        lastUpdateTime: metrics.lastUpdateTime,
      };
    } catch (error) {
      throw new HttpError(
        `Failed to fetch fund metrics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }
}
