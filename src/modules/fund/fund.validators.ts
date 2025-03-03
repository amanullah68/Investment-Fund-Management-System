import { body } from "express-validator";
import { sanitizeAddress } from "../../utils/address.js";
import { Logger } from "../../utils/logger.js";
import { HttpError } from "../../errors/http.error.js";

const logger = new Logger("Validation");

const sharesValidator = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) {
    const error = new HttpError("Invalid shares format", 400);
    logger.error(error.message, error, { inputValue: value });
    throw error;
  }

  try {
    BigInt(value);
    return true;
  } catch {
    const error = new HttpError("Shares value too large", 400);
    logger.error(error.message, error, { inputValue: value });
    throw error;
  }
};

const addressValidator = (address: string) => {
  try {
    return sanitizeAddress(address);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const httpError = new HttpError(err.message, 400);
    logger.error(httpError.message, httpError, { inputValue: address });
    throw httpError;
  }
}

export const investValidation = [
  body("investor")
    .trim()
    .custom(addressValidator),
  body("usdAmount")
    .isFloat({ min: 0.000001 })
    .withMessage("Minimum investment: 0.000001")
    .custom((value) => {
      const [, decimals] = value.toString().split(".");
      if (decimals?.length > 6) {
        const error = new HttpError("Excessive USD decimals", 400);
        logger.error(error.message, error, { inputValue: value });
        throw error;
      }
      return true;
    }),
];

export const redeemValidation = [
  body("investor")
    .trim()
    .custom(addressValidator),
  body("shares").isInt().custom(sharesValidator),
];
