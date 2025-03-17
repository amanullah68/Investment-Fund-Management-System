// src/utils/grpc-error.util.ts
import { status } from '@grpc/grpc-js';
import { HttpError } from '../errors/http.error.js';
import { Logger } from '../utils/logger.js';

export function handleGrpcError(error: unknown, logger: Logger, context: string) {
  const httpError = error instanceof HttpError ? error : new HttpError('Internal server error', 500);
  const grpcStatus = mapHttpToGrpcStatus(httpError.statusCode);
  
  logger.error(`${context} failed`, error instanceof Error ? error : new Error(String(error)), {
    originalError: httpError,
    grpcStatus
  });

  return {
    code: grpcStatus,
    message: httpError.message
  };
}

function mapHttpToGrpcStatus(httpCode: number): status {
  const mapping: Record<number, status> = {
    400: status.INVALID_ARGUMENT,
    401: status.UNAUTHENTICATED,
    403: status.PERMISSION_DENIED,
    404: status.NOT_FOUND,
    409: status.ABORTED,
    429: status.RESOURCE_EXHAUSTED,
    500: status.INTERNAL,
    503: status.UNAVAILABLE
  };

  return mapping[httpCode] || status.UNKNOWN;
}