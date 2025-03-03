import { Request, Response } from "express";
import { FundService } from "./fund.service.js";
import { sanitizeAddress } from "../../utils/address.js";
import { Logger } from "../../utils/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { handleResponse } from "../../utils/response.util.js";

export class FundController {
  private service = new FundService();
  private logger = new Logger("FundController");

  // Investment handler
  invest = async (req: Request, res: Response) => {
    const { investor, usdAmount } = req.body;
    try {
      this.logger.info("Processing investment request", {
        investor,
        usdAmount,
      });

      const result = await this.service.processInvestment(investor, usdAmount);

      this.logger.info("Investment processed successfully", {
        investor,
        usdAmount,
        result: result,
      });

      handleResponse(this.logger, res, true, "Investment processed", result);
    } catch (error) {
      this.logger.error("Investment processing failed", error as Error, {
        investor,
        usdAmount,
      });

      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      handleResponse(
        this.logger,
        res,
        false,
        error instanceof Error ? error.message : "Investment failed",
        null,
        statusCode
      );
    }
  };

  // Redemption handler
  redeem = async (req: Request, res: Response) => {
    const { investor, shares } = req.body;
    try {
      this.logger.info("Processing redemption request", {
        investor,
        shares,
      });

      const result = await this.service.processRedemption(investor, shares);

      this.logger.info("Redemption processed successfully", {
        investor,
        shares,
        result,
      });

      handleResponse(this.logger, res, true, "Redemption processed", result);
    } catch (error) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message =
        error instanceof Error ? error.message : "Redemption failed";

      this.logger.error("Redemption processing failed", error as Error, {
        investor,
        shares,
        statusCode,
      });

      handleResponse(
        this.logger,
        res,
        false,
        message,
        null, // No data on error
        statusCode // Pass the determined status code
      );
    }
  };

  // Balance handler
  getBalance = async (req: Request, res: Response) => {
    const address = req.params.address;
    try {
      this.logger.info("Fetching balance request received", { address });

      const sanitizedAddress = sanitizeAddress(address);
      const balance = await this.service.getBalance(sanitizedAddress);

      this.logger.info("Balance retrieved successfully", {
        address: sanitizedAddress,
        balance,
      });

      handleResponse(this.logger, res, true, "Balance retrieved", {
        address: sanitizedAddress,
        balance,
      });
    } catch (error) {
      this.logger.error("Balance check failed", error as Error, { address });
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      handleResponse(
        this.logger,
        res,
        false,
        error instanceof Error ? error.message : "Balance check failed",
        null,
        statusCode
      );
    }
  };

  // Metrics handler
  getMetrics = async (req: Request, res: Response) => {
    const refresh = req.query.refresh === "true";
    try {
      this.logger.info("Fetching fund metrics", { refresh });

      const metrics = await this.service.getFundMetrics(refresh);

      this.logger.info("Metrics retrieved successfully", {
        refresh,
        cacheStatus: this.service.getCacheStatus(),
      });

      handleResponse(this.logger, res, true, "Metrics retrieved", {
        ...metrics,
        cacheStatus: this.service.getCacheStatus(),
      });
    } catch (error) {
      this.logger.error("Metrics fetch failed", error as Error, { refresh });
  
      const statusCode = error instanceof HttpError ? error.statusCode : 503;
      handleResponse(
        this.logger,
        res,
        false,
        error instanceof Error ? error.message : "Metrics fetch failed",
        null,
        statusCode
      );
    }
  };
}
