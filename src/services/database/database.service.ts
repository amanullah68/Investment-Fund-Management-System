import { AppDataSource } from "../../database/dataSource.js";
import { InvestorTransaction } from "../../entities/investor-transaction.entity.js";
import { FundMetric } from "../../entities/fund-metric.entity.js";
import { BaseEntity } from "typeorm";

export class DatabaseService {
  private transactionRepository =
    AppDataSource.getRepository(InvestorTransaction);
  private metricRepository = AppDataSource.getRepository(FundMetric);

  async initialize() {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  }

  async logTransaction(
    transactionData: Omit<InvestorTransaction, keyof BaseEntity>
  ) {
    const transaction = this.transactionRepository.create(transactionData);
    return this.transactionRepository.save(transaction);
  }

  async logMetric(metricData: Omit<FundMetric, keyof BaseEntity>) {
    const metric = this.metricRepository.create(metricData);
    return this.metricRepository.save(metric);
  }

  async getRecentTransactions(limit = 100) {
    return this.transactionRepository.find({
      order: { transaction_timestamp: "DESC" },
      take: limit,
    });
  }

  async getHistoricalMetrics(days = 30) {
    return this.metricRepository
      .createQueryBuilder()
      .where("metric_timestamp >= NOW() - INTERVAL ':days days'", { days })
      .orderBy("metric_timestamp", "DESC")
      .getMany();
  }
}
