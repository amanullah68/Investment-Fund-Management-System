import "dotenv/config";
import express from "express";
import { fundRouter } from "./modules/fund/fund.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { redis } from "./infra/redis.service.js";
import {
  connectDatabaseWithRetry,
  createDatabaseIfNotExist,
  disconnectDatabase,
} from "./database/initDb.js";
import { listenToContractEvents } from "./services/blockchain/event.service.js";
import { healthService } from "./utils/health-check.js";
import { Logger } from "./utils/logger.js";
import { handleResponse } from "./utils/response.util.js";
import { HttpError } from "./errors/http.error.js";
import cors from "cors";
import { env } from "./config/config.js";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [env.CLIENT_URL],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const logger = new Logger("HealthCheck"); // Create logger instance

// Health check route
app.get("/health", async (req, res) => {
  try {
    const health = await healthService.getHealthStatus();
    handleResponse(
      logger,
      res,
      health.status === "OK",
      "Service health status",
      health,
      health.status === "OK" ? 200 : 503
    );
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    handleResponse(
      logger,
      res,
      false,
      error instanceof Error ? error.message : "Health check failed",
      null,
      statusCode
    );
  }
});

// Fund routes
app.use("/fund", fundRouter);

// Global error handling middleware
app.use(errorHandler);

async function startServer() {
  try {
    // 1. Create database if needed
    await createDatabaseIfNotExist();

    // 2. Initialize database connection with retries
    await connectDatabaseWithRetry();

    // 3. Connect to Redis
    await redis.connect();

    // 4. Start blockchain listeners
    await listenToContractEvents();

    // 5. Start HTTP server
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");

  try {
    await disconnectDatabase();
    await redis.disconnect();
    console.log("Resources cleaned up");
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exit(1);
  }
});
