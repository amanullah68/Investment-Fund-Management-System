import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { Logger } from "../utils/logger.js";
import { HttpError } from "../errors/http.error.js"; // Add import

const logger = new Logger("RequestValidation");

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessage = "Invalid request parameters";
    const error = new HttpError(errorMessage, 400); // Use HttpError

    logger.error(errorMessage, error, {
      path: req.path,
      method: req.method,
      errorCount: errors.array().length,
      errors: errors.array().map((e) => ({
        field: e.type === "field" ? e.path : "alternative_validation",
        message: e.msg,
      })),
    });

    // Match controller's response format
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      data: {
        errors: errors.array(),
      },
    });
    return;
  }

  logger.debug("Request validation passed", {
    path: req.path,
    method: req.method,
  });

  next();
};
