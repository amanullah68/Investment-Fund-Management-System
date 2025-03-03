import { Response } from "express";
import { Logger } from "./logger.js";

export function handleResponse(
  logger: Logger,
  res: Response,
  success: boolean,
  message: string,
  data?: any,
  statusCode = success ? 200 : 500
): Response {
  logger.info(`Sending response: ${message}`, {
    success,
    statusCode,
    dataType: typeof data,
  });

  return res.status(statusCode).json({
    success,
    message,
    data: formatResponseData(data),
  });
}

function formatResponseData(data: unknown): unknown {
  if (typeof data === "bigint") return data.toString();
  if (Array.isArray(data)) return data.map(formatResponseData);
  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, formatResponseData(value)])
    );
  }
  return data;
}