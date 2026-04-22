import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";
import { logger } from "../lib/logger.js";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? null
    });
    return;
  }

  logger.error({ error }, "Unhandled request error");
  res.status(500).json({
    error: "Internal server error"
  });
}
