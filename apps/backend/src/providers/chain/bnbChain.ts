import { defineChain } from "viem";
import { env } from "../../config/env.js";

export const bnbTestnetChain = defineChain({
  id: env.BNB_CHAIN_ID,
  name: "BNB Testnet",
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [env.BNB_RPC_URL]
    }
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: env.BSC_SCAN_BASE_URL
    }
  }
});
