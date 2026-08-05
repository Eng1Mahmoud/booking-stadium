/**
 * Operational error with an HTTP status code attached.
 * Thrown from services/controllers; caught by the centralized error handler.
 * Keeping this separate from unexpected/programmer errors lets the error
 * handler decide what's safe to expose to the client (see middlewares/errorHandler.ts).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
