import { apiClient } from "./client";

export interface ChallengeResponse {
  nonce: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface VerifyResponse {
  token: string;
  userId?: string;
  session?: {
    userId: string;
    walletAddress: string;
  };
}

export const authApi = {
  challenge: async (walletAddress: string): Promise<ChallengeResponse> => {
    const { data } = await apiClient.post("/auth/challenge", { walletAddress });
    return data;
  },

  verify: async (walletAddress: string, signature: string): Promise<VerifyResponse> => {
    const { data } = await apiClient.post("/auth/verify", { walletAddress, signature });
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
};
