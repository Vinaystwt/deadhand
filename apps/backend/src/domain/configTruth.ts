import { env } from "../config/env.js";
import { getConfiguredContractAddresses, getIntegrationRuntimeStatus } from "./integrations.js";

function isConfigured(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function isJwtSecretStrong(secret: string) {
  return secret.length >= 32 && secret !== "deadhand-dev-secret" && secret !== "replace-me";
}

export function getRuntimeConfigTruth() {
  const configuredContracts = getConfiguredContractAddresses();
  const integrationStatus = getIntegrationRuntimeStatus();

  const requiredNow = {
    database: {
      envVar: "DATABASE_URL",
      ready: isConfigured(env.DATABASE_URL),
      note: "Prisma/Postgres runtime persistence"
    },
    jwt: {
      envVar: "JWT_SECRET",
      ready: isJwtSecretStrong(env.JWT_SECRET),
      note: "JWT auth/session signing"
    },
    bnbRpc: {
      envVar: "BNB_RPC_URL",
      ready: isConfigured(env.BNB_RPC_URL),
      note: "BNB testnet public RPC"
    },
    bnbChainId: {
      envVar: "BNB_CHAIN_ID",
      ready: env.BNB_CHAIN_ID === 97,
      note: "Deadhand currently targets BNB testnet chainId 97"
    }
  };

  const optional = {
    anthropic: {
      envVars: ["AI_PROVIDER", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"],
      ready: env.AI_PROVIDER !== "anthropic" || isConfigured(env.ANTHROPIC_API_KEY),
      note: "Real AI runtime remains optional because mock fallback exists."
    },
    fourMeme: {
      envVars: ["FOUR_MEME_ROUTER_ADDRESS", "FOUR_MEME_FACTORY_ADDRESS"],
      routerConfigured: Boolean(configuredContracts.FOUR_MEME_ROUTER_ADDRESS),
      factoryConfigured: Boolean(configuredContracts.FOUR_MEME_FACTORY_ADDRESS),
      launchPathReady:
        Boolean(configuredContracts.FOUR_MEME_ROUTER_ADDRESS) &&
        Boolean(configuredContracts.FOUR_MEME_FACTORY_ADDRESS),
      note:
        "Four.Meme stays env-configurable until trustworthy router/factory details are confirmed. Router alone is insufficient for full launch-path confidence."
    },
    pancakeSwap: {
      envVars: ["PANCAKESWAP_ROUTER_ADDRESS"],
      ready: Boolean(configuredContracts.PANCAKESWAP_ROUTER_ADDRESS),
      routerSource: integrationStatus.adapters.pancakeSwap.routerSource,
      note: "Defaults to the official BNB testnet PancakeSwap v3 SwapRouter unless overridden."
    }
  };

  const liveExecution = {
    demoWalletAddress: {
      envVar: "DEMO_WALLET_ADDRESS",
      ready: isConfigured(env.DEMO_WALLET_ADDRESS),
      note: "Required for guarded demo-wallet execution"
    },
    demoWalletPrivateKey: {
      envVar: "DEMO_WALLET_PRIVATE_KEY",
      ready: isConfigured(env.DEMO_WALLET_PRIVATE_KEY),
      note: "Required for demo-wallet signing and broadcast"
    }
  };

  const safeDemoModeReady = Object.values(requiredNow).every((item) => item.ready);
  const fundedExecutionReady = safeDemoModeReady && Object.values(liveExecution).every((item) => item.ready);

  return {
    safeDemoModeReady,
    fundedExecutionReady,
    requiredNow,
    optional,
    liveExecution
  };
}
