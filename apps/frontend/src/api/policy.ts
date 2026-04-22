import { apiClient } from "./client";

export interface Policy {
  id: string;
  userId: string;
  walletAddress: string;
  name: string;
  description?: string | null;
  version: number;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  emergencyPaused: boolean;
  approvalThresholdBnb: string;
  maxTransactionBnb: string;
  maxDailySpendBnb: string;
  maxSlippageBps: number;
  allowedTokenAddresses: string[];
  blockedTokenAddresses: string[];
  allowedContractAddresses: string[];
  blockedContractAddresses: string[];
  allowedActionTypes: string[];
  blockedActionTypes: string[];
  simulationRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyPreset {
  key: string;
  name: string;
  mode: string;
  summary: string[];
  policy?: Partial<Policy>;
}

export interface CompilerReceipt {
  originalIntent: string;
  presetKey: string | null;
  presetName: string | null;
  compiledPolicy: Record<string, unknown>;
  compiledRules: Array<{
    ruleType: string;
    decision: "BLOCK" | "WARN" | "REQUIRES_APPROVAL";
    explanation: string;
  }>;
  validation: {
    valid: boolean;
    reasonCode: string;
    errors: string[];
  };
  structuredRuleSummary: string[];
  enforceableArtifact: {
    artifactType: string;
    compilerVersion: string;
    ruleCount: number;
  };
}

export type CreatePolicyInput = Omit<Policy, "id" | "userId" | "version" | "createdAt" | "updatedAt">;

export const policyApi = {
  list: async (): Promise<Policy[]> => {
    const { data } = await apiClient.get("/policies");
    return data;
  },

  get: async (id: string): Promise<Policy> => {
    const { data } = await apiClient.get(`/policies/${id}`);
    return data;
  },

  listPresets: async (): Promise<PolicyPreset[]> => {
    const { data } = await apiClient.get("/policies/presets");
    return data;
  },

  compile: async (text: string, presetKey?: string): Promise<CompilerReceipt> => {
    const { data } = await apiClient.post("/policies/compile", { text, presetKey });
    return data;
  },

  create: async (input: Partial<CreatePolicyInput>): Promise<Policy> => {
    const { data } = await apiClient.post("/policies", input);
    return data;
  },

  update: async (id: string, input: Partial<Policy>): Promise<Policy> => {
    const { data } = await apiClient.put(`/policies/${id}`, input);
    return data;
  },

  pause: async (id: string): Promise<Policy> => {
    const { data } = await apiClient.post(`/policies/${id}/pause`);
    return data;
  },

  resume: async (id: string): Promise<Policy> => {
    const { data } = await apiClient.post(`/policies/${id}/resume`);
    return data;
  },

  archive: async (id: string): Promise<Policy> => {
    const { data } = await apiClient.post(`/policies/${id}/archive`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/policies/${id}`);
  },
};
