import jwt from "jsonwebtoken";
import { recoverMessageAddress } from "viem";
import { addressSchema } from "@deadhand/types";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/httpError.js";
import type { AuthChallengeRepository, SessionRepository, UserRepository } from "../../domain/types.js";

export class AuthService {
  constructor(
    private readonly challenges: AuthChallengeRepository,
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository
  ) {}

  async issueChallenge(walletAddress: string): Promise<{
    nonce: string;
    message: string;
    createdAt: string;
    expiresAt: string;
    ttlSeconds: number;
  }> {
    const normalized = addressSchema.parse(walletAddress);
    const nonce = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + env.AUTH_CHALLENGE_TTL_SECONDS * 1000).toISOString();
    const message = `Deadhand authentication\nwallet=${normalized}\nnonce=${nonce}\nts=${createdAt}\nexp=${expiresAt}`;
    await this.challenges.create(normalized, { nonce, message, createdAt, expiresAt });
    return { nonce, message, createdAt, expiresAt, ttlSeconds: env.AUTH_CHALLENGE_TTL_SECONDS };
  }

  async verify(walletAddress: string, signature: string): Promise<{ token: string; userId: string }> {
    const normalized = addressSchema.parse(walletAddress);
    const challenge = await this.challenges.consume(normalized, new Date().toISOString());
    if (!challenge) {
      throw new HttpError(400, "No valid challenge found for wallet");
    }

    const recovered = await recoverMessageAddress({
      message: challenge.message,
      signature: signature as `0x${string}`
    });

    if (recovered.toLowerCase() !== normalized.toLowerCase()) {
      throw new HttpError(401, "Signature verification failed");
    }

    const user = await this.users.findOrCreate(normalized);
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.walletAddress,
        jti
      },
      env.JWT_SECRET as string,
      {
        expiresIn: env.JWT_EXPIRY_HOURS * 60 * 60
      }
    );

    await this.sessions.create({
      userId: user.id,
      jti,
      expiresAt: new Date(Date.now() + env.JWT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    });

    return { token, userId: user.id };
  }

  async authenticateToken(token: string): Promise<{ userId: string; walletAddress: string; jti: string }> {
    const payload = jwt.verify(token, env.JWT_SECRET as string) as unknown as {
      userId: string;
      walletAddress: string;
      jti: string;
    };

    const session = await this.sessions.getActiveSession(payload.jti);
    if (!session || session.userId !== payload.userId) {
      throw new HttpError(401, "Session is invalid or revoked");
    }

    return payload;
  }

  async logout(jti: string): Promise<void> {
    await this.sessions.revoke(jti);
  }
}
