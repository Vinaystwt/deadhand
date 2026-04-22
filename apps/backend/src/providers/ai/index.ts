import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { AnthropicAIProvider } from "./anthropicAIProvider.js";
import { MockAIProvider } from "./mockAIProvider.js";
import type { AIProvider } from "./types.js";

export function createAIProvider(): AIProvider {
  if (env.NODE_ENV === "test") {
    return new MockAIProvider();
  }

  switch (env.AI_PROVIDER) {
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        logger.warn("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing. Falling back to mock provider.");
        return new MockAIProvider();
      }
      return new AnthropicAIProvider();
    case "openai":
      logger.warn("AI_PROVIDER=openai is not implemented yet. Falling back to mock provider.");
      return new MockAIProvider();
    case "mock":
    default:
      return new MockAIProvider();
  }
}
