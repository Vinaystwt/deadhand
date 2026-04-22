import express from "express";
import { createRouter } from "./api/routes.js";
import { env } from "./config/env.js";
import type { Repositories } from "./domain/types.js";
import { createRepositories } from "./lib/memoryStore.js";
import { prisma } from "./lib/prisma.js";
import { createPrismaRepositories } from "./lib/prismaRepositories.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createAIProvider } from "./providers/ai/index.js";
import type { AIProvider } from "./providers/ai/types.js";
import { createChainProvider } from "./providers/chain/index.js";
import type { ChainProvider } from "./providers/chain/types.js";
import { AIService } from "./services/ai/aiService.js";
import { AuditService } from "./services/audit/auditService.js";
import { AuthService } from "./services/auth/authService.js";
import { ExecutionService } from "./services/execution/executionService.js";
import { PolicyService } from "./services/policy/policyService.js";
import { PolicyPresetService } from "./services/policy/presetService.js";
import { StoryService } from "./services/story/storyService.js";
import { TaskService } from "./services/task/taskService.js";
import { DemoWalletService } from "./services/demoWallet/demoWalletService.js";

export function createServices(options?: {
  repositories?: Repositories;
  aiProvider?: AIProvider;
  chainProvider?: ChainProvider;
}) {
  const repositories =
    options?.repositories ??
    (process.env.NODE_ENV === "test" ? createRepositories() : createPrismaRepositories(prisma));
  const audit = new AuditService(repositories.audit);
  const auth = new AuthService(repositories.authChallenges, repositories.users, repositories.sessions);
  const ai = new AIService(options?.aiProvider ?? createAIProvider());
  const presets = new PolicyPresetService();
  const policy = new PolicyService(repositories.policies, ai, presets);
  const demoWallet = new DemoWalletService();
  const execution = new ExecutionService(options?.chainProvider ?? createChainProvider(), demoWallet);
  const task = new TaskService(repositories, ai, execution, audit);
  const story = new StoryService(repositories);

  return {
    audit,
    policy,
    auth,
    ai,
    presets,
    demoWallet,
    execution,
    task,
    story
  };
}

export type Services = ReturnType<typeof createServices>;

export function createApp(services: Services = createServices()) {
  const app = express();
  const allowedOrigins = (env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []).concat([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
  ]);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json());
  app.use(createRouter(services));
  app.use(errorHandler);
  return app;
}
