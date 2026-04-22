import { apiClient } from "./client";

export const emergencyApi = {
  status: async (): Promise<{ emergencyStopped: boolean; pausedPolicies: number }> => {
    const { data } = await apiClient.get("/emergency-status");
    return data;
  },

  stop: async (): Promise<{
    emergencyStopped: boolean;
    pausedPolicies: number;
    cancelled: { taskCount: number; actionCount: number };
  }> => {
    const { data } = await apiClient.post("/emergency-stop");
    return data;
  },

  resume: async (): Promise<{ emergencyStopped: boolean; resumedPolicies: number }> => {
    const { data } = await apiClient.post("/emergency-resume");
    return data;
  },

  demoWalletStatus: async (): Promise<{
    configured: boolean;
    address?: string;
    balanceBnb?: string;
    ready: boolean;
    walletMatchesSession?: boolean;
  }> => {
    const { data } = await apiClient.get("/demo-wallet/status");
    return data;
  },
};
