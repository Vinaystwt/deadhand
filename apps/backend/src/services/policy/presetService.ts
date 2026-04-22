import type { CreatePolicyRequest, Policy } from "@deadhand/types";
import { getAllowedLaunchContracts } from "../../domain/integrations.js";

export interface PolicyPreset {
  key: string;
  name: string;
  mode: "SAFE_LAUNCH" | "AGGRESSIVE_BOUNDED" | "TREASURY_LOCKDOWN";
  description: string;
  summary: string[];
  recommendedFor: string;
  policy: Omit<CreatePolicyRequest, "walletAddress" | "name" | "description"> & {
    name: string;
    description: string;
  };
}

export class PolicyPresetService {
  list(): PolicyPreset[] {
    const allowedLaunchContracts = getAllowedLaunchContracts();

    return [
      {
        key: "launch-guard-safe",
        name: "Launch Guard Pack: Safe Launch",
        mode: "SAFE_LAUNCH",
        description: "Tight BNB launch controls with explicit router allowlists and low approval threshold.",
        summary: [
          "Low approval threshold for every meaningful spend",
          "Only launch-safe action types enabled",
          "Router allowlist limited to configured launch adapters"
        ],
        recommendedFor: "First-time demo flow and conservative launch ops",
        policy: {
          name: "Deadhand Safe Launch Guard",
          description: "Safe launch preset for Four.Meme-style launch operations on BNB testnet.",
          approvalThresholdBnb: "0.05",
          maxTransactionBnb: "0.25",
          maxDailySpendBnb: "0.75",
          maxSlippageBps: 80,
          allowedTokenAddresses: [],
          blockedTokenAddresses: [],
          allowedContractAddresses: allowedLaunchContracts,
          blockedContractAddresses: [],
          allowedActionTypes: ["FOUR_MEME_BUY", "BUY_TOKEN", "TRANSFER_NATIVE"],
          blockedActionTypes: ["SELL_TOKEN", "FOUR_MEME_SELL", "ADD_LIQUIDITY", "APPROVE_TOKEN"],
          simulationRequired: true,
          emergencyPaused: false,
          status: "ACTIVE"
        }
      },
      {
        key: "launch-guard-bounded",
        name: "Launch Guard Pack: Aggressive But Bounded",
        mode: "AGGRESSIVE_BOUNDED",
        description: "Allows a wider BNB launch surface while still enforcing bounded spend and contract scope.",
        summary: [
          "Higher but still bounded spend caps",
          "Approval required above demo-safe threshold",
          "Explicit action allowlist for launch operations"
        ],
        recommendedFor: "More dramatic but still controlled demo scenarios",
        policy: {
          name: "Deadhand Aggressive Bounded Guard",
          description: "Aggressive-but-bounded launch preset for faster launch operation execution.",
          approvalThresholdBnb: "0.1",
          maxTransactionBnb: "0.5",
          maxDailySpendBnb: "1.5",
          maxSlippageBps: 120,
          allowedTokenAddresses: [],
          blockedTokenAddresses: [],
          allowedContractAddresses: allowedLaunchContracts,
          blockedContractAddresses: [],
          allowedActionTypes: ["FOUR_MEME_BUY", "BUY_TOKEN", "TRANSFER_NATIVE", "ADD_LIQUIDITY"],
          blockedActionTypes: ["SELL_TOKEN", "FOUR_MEME_SELL"],
          simulationRequired: true,
          emergencyPaused: false,
          status: "ACTIVE"
        }
      },
      {
        key: "treasury-lockdown",
        name: "Launch Guard Pack: Treasury Lockdown",
        mode: "TREASURY_LOCKDOWN",
        description: "Minimal transfer-only preset for moving limited BNB under tight manual approval.",
        summary: [
          "Tiny approval threshold",
          "Transfer-only posture",
          "No DEX or launch adapter execution"
        ],
        recommendedFor: "Treasury or ops-wallet restricted movement",
        policy: {
          name: "Deadhand Treasury Lockdown",
          description: "Transfer-first treasury control preset for constrained launch operations.",
          approvalThresholdBnb: "0.02",
          maxTransactionBnb: "0.1",
          maxDailySpendBnb: "0.25",
          maxSlippageBps: 25,
          allowedTokenAddresses: [],
          blockedTokenAddresses: [],
          allowedContractAddresses: [],
          blockedContractAddresses: allowedLaunchContracts,
          allowedActionTypes: ["TRANSFER_NATIVE"],
          blockedActionTypes: ["BUY_TOKEN", "SELL_TOKEN", "FOUR_MEME_BUY", "FOUR_MEME_SELL", "ADD_LIQUIDITY", "APPROVE_TOKEN"],
          simulationRequired: true,
          emergencyPaused: false,
          status: "ACTIVE"
        }
      }
    ];
  }

  get(key: string): PolicyPreset | null {
    return this.list().find((preset) => preset.key === key) ?? null;
  }

  applyPreset(key: string, walletAddress: string): Partial<Policy> {
    const preset = this.get(key);
    if (!preset) {
      throw new Error("Preset not found");
    }

    return {
      ...preset.policy,
      walletAddress
    };
  }
}
