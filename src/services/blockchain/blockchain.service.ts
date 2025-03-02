import { ethers } from "ethers";
import { FundTokenABI } from "./contractABI.js";
import { env } from "../../config/config.js";
import { sanitizeAddress, validateAddress } from "../../utils/address.js";
import { FundMetrics } from "../../types/fund.js";

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

  async invest(investorAddress: string, usdAmount: number): Promise<string> {
    validateAddress(investorAddress);
    const address = sanitizeAddress(investorAddress);
    const amountWei = ethers.parseUnits(usdAmount.toFixed(6), 6);

    const tx = await this.contract.invest(address, amountWei);
    await tx.wait();
    return tx.hash;
  }

  async redeem(investorAddress: string, shares: bigint): Promise<string> {
    validateAddress(investorAddress);
    const address = sanitizeAddress(investorAddress);

    const balance = await this.contract.balanceOf(address);
    if (balance < shares) {
      throw new Error(
        `Insufficient balance: ${balance.toString()} shares available`
      );
    }

    const tx = await this.contract.redeem(address, shares);
    await tx.wait();
    return tx.hash;
  }

  async getBalance(investorAddress: string): Promise<string> {
    const balance = await this.contract.balanceOf(investorAddress);
    return balance.toString();
  }

  async getFundMetrics(): Promise<FundMetrics> {
    try {
      const metrics = await this.contract.getFundMetrics();

      return {
        totalAssetValue: metrics.totalAssetValue.toString(),
        sharesSupply: metrics.sharesSupply.toString(),
        lastUpdateTime: new Date(
          Number(metrics.lastUpdateTime) * 1000
        ).toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch fund metrics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
