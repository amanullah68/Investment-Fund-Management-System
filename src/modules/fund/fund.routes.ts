import { Router } from "express";
import { FundController } from "./fund.controller.js";
import { addressValidator, investValidation, redeemValidation } from "./fund.validators.js";
import { validateRequest } from "../../middleware/validate-request.middleware.js";
import { asyncHandler } from "../../middleware/async.middleware.js";
import { param } from "express-validator";

const router = Router();
const controller = new FundController();

router.post(
  "/invest",
  investValidation,
  validateRequest,
  asyncHandler(controller.invest)
);

router.post(
  "/redeem",
  redeemValidation,
  validateRequest,
  asyncHandler(controller.redeem)
);

router.get("/balance/:address", [
  param("address").custom(addressValidator), // Validate the :address param
  validateRequest, // Check for validation errors
], asyncHandler(controller.getBalance));

router.get("/fundMetrics", asyncHandler(controller.getMetrics));

export const fundRouter = router;
