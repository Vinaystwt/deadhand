import { env } from "../config/env.js";

export type AdapterKey = "FOUR_MEME" | "PANCAKESWAP";

// Official PancakeSwap docs list this as the BSC testnet v3 SwapRouter.
const PANCAKESWAP_BNB_TESTNET_V3_SWAP_ROUTER = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";

function getDefaultPancakeSwapRouterAddress() {
  if (env.BNB_CHAIN_ID === 97) {
    return PANCAKESWAP_BNB_TESTNET_V3_SWAP_ROUTER;
  }

  return null;
}

export function getConfiguredContractAddresses() {
  const defaultPancakeRouter = getDefaultPancakeSwapRouterAddress();
  return {
    FOUR_MEME_ROUTER_ADDRESS: env.FOUR_MEME_ROUTER_ADDRESS ?? null,
    FOUR_MEME_FACTORY_ADDRESS: env.FOUR_MEME_FACTORY_ADDRESS ?? null,
    PANCAKESWAP_ROUTER_ADDRESS: env.PANCAKESWAP_ROUTER_ADDRESS ?? defaultPancakeRouter
  };
}

export function getPlanningAvailableContracts(): Record<string, string> {
  const configured = getConfiguredContractAddresses();
  const contracts: Record<string, string> = {};

  if (configured.FOUR_MEME_ROUTER_ADDRESS) {
    contracts.FOUR_MEME = configured.FOUR_MEME_ROUTER_ADDRESS;
  }

  if (configured.PANCAKESWAP_ROUTER_ADDRESS) {
    contracts.PANCAKESWAP = configured.PANCAKESWAP_ROUTER_ADDRESS;
  }

  return contracts;
}

export function getAllowedLaunchContracts(): string[] {
  const configured = getConfiguredContractAddresses();
  return [configured.FOUR_MEME_ROUTER_ADDRESS, configured.PANCAKESWAP_ROUTER_ADDRESS].filter(
    (value): value is string => Boolean(value)
  );
}

export function getIntegrationRuntimeStatus() {
  const configured = getConfiguredContractAddresses();
  const pancakeRouterSource = env.PANCAKESWAP_ROUTER_ADDRESS ? "env" : configured.PANCAKESWAP_ROUTER_ADDRESS ? "default" : null;
  const fourMemeRouterConfigured = Boolean(configured.FOUR_MEME_ROUTER_ADDRESS);
  const fourMemeFactoryConfigured = Boolean(configured.FOUR_MEME_FACTORY_ADDRESS);

  return {
    ai: {
      configuredProvider: env.AI_PROVIDER,
      anthropicConfigured: Boolean(env.ANTHROPIC_API_KEY),
      model: env.ANTHROPIC_MODEL,
      fallbackProvider: "mock"
    },
    adapters: {
      fourMeme: {
        configured: fourMemeRouterConfigured,
        routerAddress: configured.FOUR_MEME_ROUTER_ADDRESS,
        factoryAddress: configured.FOUR_MEME_FACTORY_ADDRESS,
        planningEnabled: fourMemeRouterConfigured,
        executionReady: fourMemeRouterConfigured,
        launchPathReady: fourMemeRouterConfigured && fourMemeFactoryConfigured,
        notes: fourMemeRouterConfigured
          ? fourMemeFactoryConfigured
            ? []
            : [
                "Router is configured, so generic adapter execution is possible.",
                "Factory is still missing, so fully trusted launch-path wiring remains env-driven."
              ]
          : ["Router address is not locked yet. Planning can continue, but live execution remains adapter-gated."]
      },
      pancakeSwap: {
        configured: Boolean(configured.PANCAKESWAP_ROUTER_ADDRESS),
        routerAddress: configured.PANCAKESWAP_ROUTER_ADDRESS,
        routerSource: pancakeRouterSource,
        routerKind: "V3_SWAP_ROUTER",
        planningEnabled: Boolean(configured.PANCAKESWAP_ROUTER_ADDRESS),
        executionReady: Boolean(configured.PANCAKESWAP_ROUTER_ADDRESS),
        notes: configured.PANCAKESWAP_ROUTER_ADDRESS
          ? pancakeRouterSource === "default"
            ? ["Using Deadhand's BNB testnet PancakeSwap default router. Set PANCAKESWAP_ROUTER_ADDRESS to override."]
            : []
          : ["Router address is not locked yet. Planning can continue, but live execution remains adapter-gated."]
      }
    }
  };
}

export function getConfiguredRouterForAdapter(adapter: AdapterKey): string | null {
  const configured = getConfiguredContractAddresses();
  if (adapter === "FOUR_MEME") {
    return configured.FOUR_MEME_ROUTER_ADDRESS;
  }

  return configured.PANCAKESWAP_ROUTER_ADDRESS;
}
