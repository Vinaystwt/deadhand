import type { Policy } from "@deadhand/types";

export interface DemoPersona {
  userId: string;
  walletAddress: string;
  name: string;
  policy: Omit<Policy, "id" | "userId" | "createdAt" | "updatedAt" | "walletAddress">;
  goals: string[];
}

export const demoPersonas: DemoPersona[] = [
  {
    userId: "00000000-0000-0000-0000-000000000001",
    walletAddress: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
    name: "Alex",
    policy: {
      name: "PEPEX Launch Policy",
      description: "Tight launch controls for Four.Meme and follow-on router buys",
      version: 1,
      status: "ACTIVE",
      emergencyPaused: false,
      approvalThresholdBnb: "0.1",
      maxTransactionBnb: "0.5",
      maxDailySpendBnb: "2.0",
      maxSlippageBps: 100,
      allowedTokenAddresses: [],
      blockedTokenAddresses: [],
      allowedContractAddresses: [],
      blockedContractAddresses: [],
      allowedActionTypes: [],
      blockedActionTypes: [],
      simulationRequired: true
    },
    goals: [
      "Help me set up launch liquidity using about 2 BNB total",
      "Help me launch",
      "Buy the token with 0.1 BNB after launch"
    ]
  },
  {
    userId: "00000000-0000-0000-0000-000000000002",
    walletAddress: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    name: "Riley",
    policy: {
      name: "Conservative Treasury Policy",
      description: "Small transfers only, manual review on anything meaningful",
      version: 1,
      status: "ACTIVE",
      emergencyPaused: false,
      approvalThresholdBnb: "0.03",
      maxTransactionBnb: "0.15",
      maxDailySpendBnb: "0.5",
      maxSlippageBps: 75,
      allowedTokenAddresses: [],
      blockedTokenAddresses: [],
      allowedContractAddresses: [],
      blockedContractAddresses: [],
      allowedActionTypes: ["TRANSFER_NATIVE", "BUY_TOKEN", "FOUR_MEME_BUY"],
      blockedActionTypes: [],
      simulationRequired: true
    },
    goals: ["Transfer 0.05 BNB to launch ops wallet", "Help me launch"]
  }
];
