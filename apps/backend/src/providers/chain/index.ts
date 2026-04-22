import type { ChainProvider } from "./types.js";
import { ViemChainProvider } from "./viemChainProvider.js";

export function createChainProvider(): ChainProvider {
  return new ViemChainProvider();
}
