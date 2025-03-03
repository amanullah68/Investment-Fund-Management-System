import request from "supertest";
import express from "express";
import { fundRouter } from "../src/modules/fund/fund.routes.js";
import { FundService } from "../src/modules/fund/fund.service.js";
import { HttpError } from "../src/errors/http.error.js";
import { ethers } from "ethers";
import { startGanache, stopGanache } from "./setupBlockchain";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_ADDRESS_MIXED_CASE = ethers.getAddress(
  "0x1234567890123456789012345678901234567890".toLowerCase()
);
const TEST_INVALID_ADDRESS = "invalid-address";

interface InvestmentResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    txHash: string;
  };
}

interface BalanceResponse {
  success: boolean;
  message: string;
  data: {
    address: string;
    balance: string;
  };
}

interface MetricsResponse {
  success: boolean;
  message: string;
  data: {
    totalAssetValue: number;
    sharesSupply: number;
    lastUpdateTime: Date;
    cacheStatus: string;
  };
}

const app = express();
app.use(express.json());
app.use("/fund", fundRouter);

jest.mock("../src/services/blockchain/blockchain.service.js", () => ({
  BlockchainService: jest.fn().mockImplementation(() => ({
    invest: jest.fn(),
    redeem: jest.fn(),
    getBalance: jest.fn(),
    getFundMetrics: jest.fn(),
    destroy: jest.fn(),
  })),
}));

describe("Fund Endpoints", () => {
  let fundService: FundService;

  beforeAll(async () => {
    await startGanache();
    fundService = new FundService();
  });

  afterAll(async () => {
    await stopGanache();
    const { BlockchainService } = await import(
      "../src/services/blockchain/blockchain.service.js"
    );
    (BlockchainService as jest.Mock).mock.instances.forEach((instance: any) => {
      if (instance.destroy) instance.destroy();
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  describe("POST /fund/invest", () => {
    const validRequest = { investor: TEST_ADDRESS, usdAmount: 100 };

    it("should process valid investment", async () => {
      jest.spyOn(FundService.prototype, "processInvestment").mockResolvedValue({
        status: "success",
        txHash: "0xtestinvest",
      });

      const res = await request(app).post("/fund/invest").send(validRequest);
      expect(res.statusCode).toBe(200);
      const body = res.body as InvestmentResponse;
      expect(body.success).toBe(true);
      expect(body.data.txHash).toMatch(/^0x/);
    });

    it("should reject invalid address format", async () => {
      const res = await request(app)
        .post("/fund/invest")
        .send({ ...validRequest, investor: TEST_INVALID_ADDRESS });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch("Invalid request parameters");
    });

    it("should reject negative USD amount", async () => {
      const res = await request(app)
        .post("/fund/invest")
        .send({ ...validRequest, usdAmount: -100 });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch("Invalid request parameters");
    });

    it("should handle blockchain failure", async () => {
      jest
        .spyOn(FundService.prototype, "processInvestment")
        .mockRejectedValue(new Error("Blockchain error"));
      const res = await request(app).post("/fund/invest").send(validRequest);
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /fund/redeem", () => {
    const validRequest = { investor: TEST_ADDRESS, shares: "100" };

    it("should process valid redemption", async () => {
      jest.spyOn(FundService.prototype, "processRedemption").mockResolvedValue({
        status: "success",
        txHash: "0xtestredeem",
      });
      const res = await request(app).post("/fund/redeem").send(validRequest);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.txHash).toBe("0xtestredeem");
    });

    it("should reject non-integer shares", async () => {
      const res = await request(app)
        .post("/fund/redeem")
        .send({ ...validRequest, shares: "100.5" });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch("Invalid request parameters");
    });

    it("should handle insufficient shares", async () => {
      jest
        .spyOn(FundService.prototype, "processRedemption")
        .mockRejectedValue(new HttpError("Insufficient balance", 409));
      const res = await request(app).post("/fund/redeem").send(validRequest);
      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/insufficient/i);
    });

    it("should handle service unavailable", async () => {
      jest
        .spyOn(FundService.prototype, "processRedemption")
        .mockRejectedValue(new HttpError("Service unavailable", 503));
      const res = await request(app).post("/fund/redeem").send(validRequest);
      expect(res.statusCode).toBe(503);
    });
  });

  describe("GET /fund/balance/:address", () => {
    it("should return balance for valid address", async () => {
      jest.spyOn(FundService.prototype, "getBalance").mockResolvedValue("1500");
      const res = await request(app).get(`/fund/balance/${TEST_ADDRESS}`);
      const body = res.body as BalanceResponse;
      expect(res.statusCode).toBe(200);
      expect(body.data.balance).toBe("1500");
    });

    describe("GET /fund/balance/:address", () => {
      it("should sanitize mixed-case addresses", async () => {
        const mockGetBalance = jest
          .spyOn(FundService.prototype, "getBalance")
          .mockResolvedValue("1000");
        const expectedAddress = ethers.getAddress(TEST_ADDRESS_MIXED_CASE);
        await request(app).get(`/fund/balance/${TEST_ADDRESS_MIXED_CASE}`);
        expect(mockGetBalance).toHaveBeenCalledWith(expectedAddress);
      });
    });

    it("should handle balance check failure", async () => {
      jest
        .spyOn(FundService.prototype, "getBalance")
        .mockRejectedValue(new Error("Blockchain error"));
      const res = await request(app).get(`/fund/balance/${TEST_ADDRESS}`);
      expect(res.statusCode).toBe(500);
    });

    it("should reject invalid address format", async () => {
      const res = await request(app).get(
        `/fund/balance/${TEST_INVALID_ADDRESS}`
      );
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /fund/fundMetrics", () => {
    const mockMetrics = {
      totalAssetValue: 1000000,
      sharesSupply: 500000,
      lastUpdateTime: new Date("2023-01-01T00:00:00.000Z"),
    };

    it("should return fresh metrics", async () => {
      jest
        .spyOn(FundService.prototype, "getFundMetrics")
        .mockResolvedValue(mockMetrics);
      jest
        .spyOn(FundService.prototype, "getCacheStatus")
        .mockReturnValue("fresh");
      const res = await request(app).get("/fund/fundMetrics");
      const body = res.body as MetricsResponse;
      expect(res.statusCode).toBe(200);
      expect(body.data.cacheStatus).toBe("fresh");
      expect(body.data.totalAssetValue).toBe(1000000);
    });

    it("should force refresh when requested", async () => {
      const mockGetMetrics = jest
        .spyOn(FundService.prototype, "getFundMetrics")
        .mockResolvedValue(mockMetrics);
      await request(app).get("/fund/fundMetrics?refresh=true");
      expect(mockGetMetrics).toHaveBeenCalledWith(true);
    });

    it("should handle metrics fetch failure", async () => {
      jest
        .spyOn(FundService.prototype, "getFundMetrics")
        .mockRejectedValue(new HttpError("Service unavailable", 503));
      const res = await request(app).get("/fund/fundMetrics");
      expect(res.statusCode).toBe(503);
    });
  });
});
