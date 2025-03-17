// src/modules/fund/grpc.validators.ts
import { Logger } from "../../utils/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { sanitizeAddress } from "../../utils/address.js";

const logger = new Logger("gRPC Validation");

export function validateInvestRequest(request: { investor: string; usdAmount: number }) {
  try {
    const investor = validateAddressParam(request.investor);
    
    if (request.usdAmount <= 0) {
      throw new HttpError("USD amount must be positive", 400);
    }
    
    const [, decimals] = request.usdAmount.toString().split(".");
    if (decimals?.length > 6) {
      throw new HttpError("Excessive USD decimals (max 6)", 400);
    }
    
    return {
      investor: investor,
      usdAmount: request.usdAmount
    };
  } catch (error) {
    logger.error("Investment validation failed", error as Error, request);
    throw error;
  }
}

export function validateRedeemRequest(request: { investor: string; shares: string }) {
  try {
    const investor = validateAddressParam(request.investor);
    
    if (!/^[1-9]\d*$/.test(request.shares)) {
      throw new HttpError("Invalid shares format", 400);
    }
    
    const shares = BigInt(request.shares);
    if (shares <= 0n) {
      throw new HttpError("Shares must be positive", 400);
    }
    
    return {
      investor,
      shares
    };
  } catch (error) {
    logger.error("Redemption validation failed", error as Error, request);
    throw error;
  }
}

export function validateAddressParam(address: string) {
  try {
    return sanitizeAddress(address);
  } catch (error) {
    logger.error("Address validation failed", error as Error, { address });
    throw new HttpError("Invalid address format", 400);
  }
}