import { body } from "express-validator";
import { ethers } from "ethers";
import { sanitizeAddress, validateAddress } from "../../utils/address.js";

const sharesValidator = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) throw new Error("Invalid shares format");
  try {
    BigInt(value);
    return true;
  } catch {
    throw new Error("Shares value too large");
  }
};

export const investValidation = [
  body("investor")
    .trim()
    .custom(validateAddress)
    .withMessage("Invalid Address")
    .bail()
    .customSanitizer((value) => ethers.getAddress(value)),

  body("usdAmount")
    .isFloat({ min: 0.000001 })
    .withMessage("Minimum investment: 0.000001")
    .custom((value) => {
      const [, decimals] = value.toString().split(".");
      return !decimals || decimals.length <= 6;
    }),
];

export const redeemValidation = [
  body("investor")
    .trim()
    .custom(sanitizeAddress)
    .withMessage("Invalid Address"),

  body("shares").isInt().custom(sharesValidator),
];
