// src/services/blockchain/contract-events.ts
import { ethers } from "ethers";
import { AppDataSource } from "../../database/dataSource.js";
import { env } from "../../config/config.js";
import { FundTokenABI } from "./contractABI.js";
import { InvestorTransaction } from "../../entities/investor-transaction.entity.js";
import { TransactionType } from "../../types/transaction.type.js";
import { FundMetric } from "../../entities/fund-metric.entity.js";
import { Logger } from "../../utils/logger.js";

const logger = new Logger("ContractEvents");

export function listenToContractEvents() {
  try {
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    const contract = new ethers.Contract(
      env.CONTRACT_ADDRESS,
      FundTokenABI,
      provider
    );

    logger.info("Initializing contract event listeners", {
      contractAddress: env.CONTRACT_ADDRESS,
      rpcUrl: env.RPC_URL
    });

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
        const txHash = (await event.getTransaction()).hash;
        const block = await event.getBlock();

        try {
          const investorTransactionRepo = AppDataSource.getRepository(InvestorTransaction);
          
          const investment = investorTransactionRepo.create({
            transaction_hash: txHash,
            investor_address: investor,
            transaction_type: TransactionType.INVEST,
            usd_amount: Number(ethers.formatUnits(usdAmount, 6)),
            shares_issued: Number(sharesIssued),
            share_price: Number(ethers.formatUnits(sharePrice, 6)),
            transaction_timestamp: new Date(block.timestamp * 1000),
          });

          await investorTransactionRepo.save(investment);
          logger.info("Investment event processed successfully", {
            txHash,
            investor,
            amount: ethers.formatUnits(usdAmount, 6)
          });
        } catch (error) {
          logger.error("Error saving Investment event", error as Error, {
            txHash,
            investor
          });
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
        const txHash = (await event.getTransaction()).hash;
        const block = await event.getBlock();

        try {
          const investorTransactionRepo = AppDataSource.getRepository(InvestorTransaction);

          const redemption = investorTransactionRepo.create({
            transaction_hash: txHash,
            investor_address: investor,
            transaction_type: TransactionType.REDEEM,
            usd_amount: Number(ethers.formatUnits(usdAmount, 6)),
            shares_issued: Number(shares),
            share_price: Number(ethers.formatUnits(sharePrice, 6)),
            transaction_timestamp: new Date(block.timestamp * 1000),
          });

          await investorTransactionRepo.save(redemption);
          logger.info("Redemption event processed successfully", {
            txHash,
            investor,
            shares: shares.toString()
          });
        } catch (error) {
          logger.error("Error saving Redemption event", error as Error, {
            txHash,
            investor
          });
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
        const txHash = (await event.getTransaction()).hash;
        const block = await event.getBlock();

        try {
          const fundMetricRepo = AppDataSource.getRepository(FundMetric);

          const metrics = fundMetricRepo.create({
            transaction_hash: txHash,
            total_asset_value: Number(ethers.formatUnits(totalAssetValue, 6)),
            shares_supply: Number(sharesSupply),
            share_price: Number(ethers.formatUnits(sharePrice, 6)),
            metric_timestamp: new Date(block.timestamp * 1000),
          });

          await fundMetricRepo.save(metrics);
          logger.info("MetricsUpdated event processed successfully", {
            txHash,
            totalAssets: ethers.formatUnits(totalAssetValue, 6)
          });
        } catch (error) {
          logger.error("Error saving MetricsUpdated event", error as Error, {
            txHash
          });
        }
      }
    );

  } catch (error) {
    logger.error("Failed to initialize contract listeners", error as Error);
    throw error;
  }
}