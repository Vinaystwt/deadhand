import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/httpError.js";
import type { AuthService } from "../services/auth/authService.js";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    walletAddress: string;
    jti: string;
  };
}

export function createRequireAuth(authService: AuthService) {
  return async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new HttpError(401, "Missing bearer token");
      }

      const token = header.slice("Bearer ".length);
      req.auth = await authService.authenticateToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
