import { Response } from "express";

export const errorHandler = (err: any, res: Response) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
