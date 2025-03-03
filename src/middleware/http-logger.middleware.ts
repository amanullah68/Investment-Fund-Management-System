import morgan from "morgan";
import { Logger } from "../utils/logger.js";

const logger = new Logger("HTTP");

export const httpLogger = morgan((tokens, req, res) => {
  const message = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    `${tokens["response-time"](req, res)}ms`,
    `- ${tokens.res(req, res, "content-length") || 0}b`
  ].join(" ");

  logger.info(message, {
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens["response-time"](req, res),
    contentLength: tokens.res(req, res, "content-length")
  });

  return message;
});