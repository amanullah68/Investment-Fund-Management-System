// src/app.ts
import "dotenv/config";
import express from "express";
import { fundRouter } from "./modules/fund/fund.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { redis } from "./infra/redis.js";
import { AppDataSource } from "./database/data-source.js";
import { createDatabaseIfNotExist } from "./database/init-db.js";
import { listenToContractEvents } from "./services/blockchain/event.service.js";

const app = express();
app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Fund routes
app.use("/fund", fundRouter);

// Global error handling middleware
app.use(errorHandler);

// redis connection
redis
  .connect()
  .then(() => {
    console.log("Connected to Redis");
  })
  .catch((err) => {
    console.error("Error connecting to Redis:", err);
  });

async function startServer() {
  try {
    await createDatabaseIfNotExist();
    await AppDataSource.initialize();
    console.log("Connected to Postgres");

    listenToContractEvents();

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    process.exit(1);
  }
}

startServer();

process.on("SIGINT", async () => {
  await redis.disconnect();
  process.exit();
});
