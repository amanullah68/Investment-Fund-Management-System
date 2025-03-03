import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/config.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { InvestorTransaction } from "../entities/investor-transaction.entity.js";
import { FundMetric } from "../entities/fund-metric.entity.js";

// Create __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.POSTGRES_HOST,
  port: parseInt(env.POSTGRES_PORT),
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  entities: [InvestorTransaction, FundMetric],
  synchronize: true,
  logging: false,
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  subscribers: [],
});
