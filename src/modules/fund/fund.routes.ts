import { Router } from "express";
import { FundController } from "./fund.controller.js";
import { investValidation, redeemValidation } from "./fund.validators.js";
import { validateRequest } from "../../middleware/validate-request.middleware.js";
import { asyncHandler } from "../../middleware/async.middleware.js";

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

router.get("/balance/:address", asyncHandler(controller.getBalance));
router.get("/fundMetrics", asyncHandler(controller.getMetrics));

export const fundRouter = router;
