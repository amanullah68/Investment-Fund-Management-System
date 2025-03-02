// fund.controller.ts (updated)
import { Request, Response } from "express";
import { FundService } from "./fund.service.js";
import { sanitizeAddress } from "../../utils/address.js";

export class FundController {
  private service = new FundService();

  private handleResponse(
    res: Response,
    success: boolean,
    message: string,
    data?: any,
    statusCode = success ? 200 : 500
  ): Response {
    return res.status(statusCode).json({
      success,
      message,
      data: typeof data === "bigint" ? data.toString() : data,
    });
  }

  // Investment handler
  invest = async (req: Request, res: Response) => {
    try {
      const result = await this.service.processInvestment(
        req.body.investor,
        req.body.usdAmount
      );
      this.handleResponse(res, true, "Investment processed", result);
    } catch (error) {
      this.handleResponse(
        res,
        false,
        error instanceof Error ? error.message : "Investment failed"
      );
    }
  };

  // Redemption handler
  redeem = async (req: Request, res: Response) => {
    try {
      const result = await this.service.processRedemption(
        req.body.investor,
        req.body.shares
      );
      this.handleResponse(res, true, "Redemption processed", result);
    } catch (error) {
      this.handleResponse(
        res,
        false,
        error instanceof Error ? error.message : "Redemption failed"
      );
    }
  };

  // Balance handler
  getBalance = async (req: Request, res: Response) => {
    try {
      const address = sanitizeAddress(req.params.address);
      const balance = await this.service.getBalance(address);
      this.handleResponse(res, true, "Balance retrieved", {
        address: address,
        balance,
      });
    } catch (error) {
      this.handleResponse(
        res,
        false,
        error instanceof Error ? error.message : "Balance check failed"
      );
    }
  };

  // Metrics handler
  // src/modules/fund/fund.controller.ts
  getMetrics = async (req: Request, res: Response) => {
    try {
      const refresh = req.query.refresh === "true";
      const metrics = await this.service.getFundMetrics(refresh);

      this.handleResponse(res, true, "Metrics retrieved", {
        ...metrics,
        cacheStatus: this.service.getCacheStatus(),
      });
    } catch (error) {
      this.handleResponse(
        res,
        false,
        error instanceof Error ? error.message : "Metrics fetch failed",
        null,
        503
      );
    }
  };
}
