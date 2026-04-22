import { config as loadEnv } from "dotenv";
import { aiProviderSchema, addressSchema } from "@deadhand/types";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "../../../../");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const optionalAddressSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  addressSchema
    .refine((address) => address.toLowerCase() !== ZERO_ADDRESS, "Zero address is not a valid runtime integration target")
    .optional()
);

loadEnv({ path: path.resolve(repoRoot, ".env") });
loadEnv({ path: path.resolve(repoRoot, ".env.local"), override: true });
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGINS: z.string().optional().transform((value) => value || undefined),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/deadhand"),
  REDIS_URL: z.string().optional().transform((value) => value || undefined),
  JWT_SECRET: z.string().default("deadhand-dev-secret"),
  JWT_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  BNB_CHAIN_ID: z.coerce.number().int().positive().default(97),
  BNB_RPC_URL: z.string().default("https://data-seed-prebsc-1-s1.binance.org:8545"),
  BSC_SCAN_BASE_URL: z.string().default("https://testnet.bscscan.com"),
  AI_PROVIDER: aiProviderSchema.default("mock"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  OPENAI_API_KEY: z.string().optional(),
  FOUR_MEME_FACTORY_ADDRESS: optionalAddressSchema,
  FOUR_MEME_ROUTER_ADDRESS: optionalAddressSchema,
  PANCAKESWAP_ROUTER_ADDRESS: optionalAddressSchema,
  DEMO_WALLET_ADDRESS: optionalAddressSchema,
  DEMO_WALLET_PRIVATE_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);

if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
  throw new Error("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY");
}
