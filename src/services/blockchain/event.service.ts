// src/listeners/contractEventsListener.ts
import { ethers } from "ethers";
import { AppDataSource } from "../../database/data-source.js";
import { env } from "../../config/config.js";
import { FundTokenABI } from "./contractABI.js";
import {
  InvestorTransaction,
} from "../../entities/InvestorTransaction.js";
import {TransactionType} from "../../types/Tranasction.js";
import { FundMetric } from "../../entities/FundMetric.js";

export function listenToContractEvents() {
  const provider = new ethers.JsonRpcProvider(env.RPC_URL);
  const contract = new ethers.Contract(
    env.CONTRACT_ADDRESS,
    FundTokenABI,
    provider
  );

  // Investment event listener
  contract.on(
    "Investment",
    async (
      investor: string,
      usdAmount: bigint,
      sharesIssued: bigint,
      sharePrice: bigint,
      event: ethers.EventLog
    ) => {
      console.log(
        "transactionHash..........",
        (await event.getTransaction()).hash
      );
      const txHash = await event.getTransaction();
      const block = await event.getBlock();

      console.log("Investment event received:", {
        investor,
        usdAmount: usdAmount.toString(),
        sharesIssued: sharesIssued.toString(),
        sharePrice: sharePrice.toString(),
        txHash: txHash.hash,
        transaction_timestamp: new Date(block.timestamp * 1000),
      });

      try {
        const investorTransactionRepo =
          AppDataSource.getRepository(InvestorTransaction);

        const investment = investorTransactionRepo.create({
          transaction_hash: txHash.hash, // Must come from BaseEntity
          investor_address: investor,
          transaction_type: TransactionType.INVEST,
          usd_amount: Number(ethers.formatUnits(usdAmount, 6)),
          shares_issued: Number(sharesIssued),
          share_price: Number(ethers.formatUnits(sharePrice, 6)),
          transaction_timestamp: new Date(block.timestamp * 1000), // Or use block timestamp
        });

        await investorTransactionRepo.save(investment);
        console.log("Investment event saved to database.");
      } catch (error) {
        console.error("Error saving Investment event:", error);
      }
    }
  );

  // Redemption event listener
  contract.on(
    "Redemption",
    async (
      investor: string,
      shares: bigint,
      usdAmount: bigint,
      sharePrice: bigint,
      event: ethers.EventLog
    ) => {
      const txHash = await event.getTransaction();
      const block = await event.getBlock();
      console.log("Redemption event received:", {
        investor,
        shares: shares.toString(),
        usdAmount: usdAmount.toString(),
        sharePrice: sharePrice.toString(),
        txHash: txHash.hash,
        transaction_timestamp: new Date(block.timestamp * 1000),
      });

      try {
        const investorTransactionRepo =
          AppDataSource.getRepository(InvestorTransaction);

        const redemption = investorTransactionRepo.create({
          transaction_hash: txHash.hash,
          investor_address: investor,
          transaction_type: TransactionType.REDEEM,
          usd_amount: Number(ethers.formatUnits(usdAmount, 6)),
          shares_issued: Number(shares),
          share_price: Number(ethers.formatUnits(sharePrice, 6)),
          transaction_timestamp: new Date(block.timestamp * 1000), // Or use block timestamp
        });

        await investorTransactionRepo.save(redemption);
        console.log("Redemption event saved to database.");
      } catch (error) {
        console.error("Error saving Redemption event:", error);
      }
    }
  );

  // MetricsUpdated listener
  contract.on(
    "MetricsUpdated",
    async (
      totalAssetValue: bigint,
      sharesSupply: bigint,
      sharePrice: bigint,
      event: ethers.EventLog
    ) => {
      try {
        const txHash = await event.getTransaction();
        const block = await event.getBlock();

        console.log("Redemption event received:", {
          transaction_hash: txHash.hash,
          total_asset_value: Number(ethers.formatUnits(totalAssetValue, 6)),
          shares_supply: Number(sharesSupply),
          share_price: Number(ethers.formatUnits(sharePrice, 6)),
          metric_timestamp: new Date(block.timestamp * 1000),
        });

        const fundMetricRepo = AppDataSource.getRepository(FundMetric);

        const metrics = fundMetricRepo.create({
          transaction_hash: txHash.hash,
          total_asset_value: Number(ethers.formatUnits(totalAssetValue, 6)),
          shares_supply: Number(sharesSupply),
          share_price: Number(ethers.formatUnits(sharePrice, 6)),
          metric_timestamp: new Date(block.timestamp * 1000),
        });

        await fundMetricRepo.save(metrics);
        console.log("MetricsUpdated event saved to database.");
      } catch (error) {
        console.error("Error saving MetricsUpdated event:", error);
      }
    }
  );
}
