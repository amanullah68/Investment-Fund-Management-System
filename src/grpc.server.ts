import "dotenv/config";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { FundService } from "./modules/fund/fund.service.js";
import { healthService } from "./utils/health-check.js";
import { Logger } from "./utils/logger.js";
import { env } from "./config/config.js";

// Import startup utilities (database, redis, blockchain listeners)
import {
  connectDatabaseWithRetry,
  createDatabaseIfNotExist,
  disconnectDatabase,
} from "./database/initDb.js";
import { redis } from "./infra/redis.service.js";
import { listenToContractEvents } from "./services/blockchain/event.service.js";
import {
  validateAddressParam,
  validateInvestRequest,
  validateRedeemRequest,
} from "./modules/fund/fund.validators.js";
import { handleGrpcError } from "./errors/grpc.error.js";

// Load the proto file
const PROTO_PATH = new URL("./proto/fund.proto", import.meta.url).pathname;
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const fundProto = protoDescriptor.fund;

// Create a logger instance
const logger = new Logger("gRPC Server");

// Instantiate your business logic service
const fundService = new FundService();

/**
 * Implement the gRPC service methods.
 */
const grpcHandlers = {
  // RPC for processing an investment.
  invest: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const validated = validateInvestRequest(call.request);
      const result = await fundService.processInvestment(
        validated.investor,
        validated.usdAmount
      );
      callback(null, { status: result.status, txHash: result.txHash });
    } catch (error) {
      const grpcError = handleGrpcError(error, logger, "Invest RPC");
      callback(grpcError, null);
    }
  },

  // RPC for processing a redemption.
  redeem: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const validated = validateRedeemRequest(call.request);
      const result = await fundService.processRedemption(
        validated.investor,
        validated.shares
      );
      callback(null, { status: result.status, txHash: result.txHash });
    } catch (error) {
      const grpcError = handleGrpcError(error, logger, "Redeem RPC");
      callback(grpcError, null);
    }
  },

  // RPC for retrieving an investor’s balance.
  getBalance: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const address = validateAddressParam(call.request.address);
      const balance = await fundService.getBalance(address);
      callback(null, { balance });
    } catch (error) {
      const grpcError = handleGrpcError(error, logger, "GetBalance RPC");
      callback(grpcError, null);
    }
  },

  // RPC for fetching fund metrics.
  getMetrics: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const { refresh } = call.request;
      const metrics = await fundService.getFundMetrics(refresh);
      callback(null, {
        totalAssetValue: metrics.totalAssetValue.toString(),
        sharesSupply: metrics.sharesSupply.toString(),
        lastUpdateTime: metrics.lastUpdateTime,
        cacheStatus: fundService.getCacheStatus(),
      });
    } catch (error) {
      const grpcError = handleGrpcError(error, logger, "GetMetrics RPC");
      callback(grpcError, null);
    }
  },

  // RPC for health checking.
  healthCheck: async (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    try {
      const health = await healthService.getHealthStatus();
      callback(null, {
        status: health.status,
        message: "Service health status",
      });
    } catch (error) {
      const grpcError = handleGrpcError(error, logger, "HealthCheck RPC");
      callback(grpcError, null);
    }
  },
};

/**
 * Start the gRPC server after initializing dependencies.
 */
async function startServer() {
  try {
    // 1. Create database if needed
    await createDatabaseIfNotExist();

    // 2. Connect to the database with retry logic
    await connectDatabaseWithRetry();

    // 3. Connect to Redis
    await redis.connect();

    // 4. Start blockchain event listeners
    await listenToContractEvents();

    // 5. Initialize and start the gRPC server
    const server = new grpc.Server();
    server.addService(fundProto.FundService.service, grpcHandlers);

    // Define the gRPC port (you can use an environment variable)
    const GRPC_PORT = env.GRPC_PORT || "50051";
    server.bindAsync(
      `0.0.0.0:${GRPC_PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error("gRPC server failed to start", error);
          process.exit(1);
        }
        logger.info(`gRPC server running on port ${port}`);
        server.start();
      }
    );
  } catch (error) {
    logger.error("Error starting the gRPC server", error as Error);
    process.exit(1);
  }
}

startServer();

/**
 * Handle graceful shutdown.
 */
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  try {
    await disconnectDatabase();
    await redis.disconnect();
    logger.info("Resources cleaned up");
    process.exit(0);
  } catch (error) {
    logger.error("Graceful shutdown failed", error as Error);
    process.exit(1);
  }
});
