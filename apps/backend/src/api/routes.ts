import { Router } from "express";
import { asyncHandler } from "./asyncHandler.js";
import { createRequireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { auditQuerySchema, taskExportQuerySchema } from "@deadhand/types";
import { getIntegrationRuntimeStatus } from "../domain/integrations.js";
import { getRuntimeConfigTruth } from "../domain/configTruth.js";
import type { Services } from "../index.js";

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createRouter(services: Services): Router {
  const router = Router();
  const requireAuth = createRequireAuth(services.auth);

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "deadhand-backend" });
  });

  router.get("/integrations/status", (_req, res) => {
    res.json({
      ...getIntegrationRuntimeStatus(),
      config: getRuntimeConfigTruth()
    });
  });

  router.get("/demo-wallet/status", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = await services.demoWallet.getStatus();
    res.json({
      ...status,
      walletMatchesSession:
        Boolean(status.address) && status.address!.toLowerCase() === req.auth!.walletAddress.toLowerCase()
    });
  }));

  router.post("/auth/challenge", asyncHandler(async (req, res) => {
    const { walletAddress } = req.body as { walletAddress: string };
    const challenge = await services.auth.issueChallenge(walletAddress);
    res.json(challenge);
  }));

  router.post("/auth/verify", asyncHandler(async (req, res) => {
    const { walletAddress, signature } = req.body as { walletAddress: string; signature: string };
    const result = await services.auth.verify(walletAddress, signature);
    res.json({
      token: result.token,
      userId: result.userId,
      session: {
        userId: result.userId,
        walletAddress
      }
    });
  }));

  router.post("/auth/logout", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    await services.auth.logout(req.auth!.jti);
    res.json({ ok: true, success: true });
  }));

  router.get("/policies", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.policy.list(req.auth!.userId));
  }));

  router.get("/policies/presets", requireAuth, asyncHandler(async (_req: AuthenticatedRequest, res) => {
    res.json(services.policy.listPresets());
  }));

  router.post("/policies/compile", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const receipt = await services.policy.compilePolicy(req.auth!.userId, req.auth!.walletAddress, req.body);
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "POLICY_COMPILED",
      metadata: {
        reasonCode: receipt.validation.reasonCode,
        reasonCodes: [receipt.validation.reasonCode],
        severity: receipt.validation.valid ? "INFO" : "HIGH",
        storyClass: "POLICY_COMPILER",
        compilerReceipt: receipt
      }
    });
    res.json(receipt);
  }));

  router.post("/policies", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const policy = await services.policy.create(req.auth!.userId, {
      ...req.body,
      walletAddress: req.auth!.walletAddress
    });
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "POLICY_CREATED",
      metadata: { policyId: policy.id }
    });
    res.status(201).json(policy);
  }));

  router.get("/policies/:id", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.policy.get(param(req.params.id)));
  }));

  router.put("/policies/:id", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const policy = await services.policy.update(req.auth!.userId, param(req.params.id), req.body);
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "POLICY_UPDATED",
      metadata: { policyId: policy.id, version: policy.version }
    });
    res.json(policy);
  }));

  router.post("/policies/:id/pause", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const policy = await services.policy.setPolicyPaused(req.auth!.userId, param(req.params.id), true);
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "POLICY_PAUSED",
      metadata: { policyId: policy.id }
    });
    res.json(policy);
  }));

  router.post("/policies/:id/resume", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const policy = await services.policy.setPolicyPaused(req.auth!.userId, param(req.params.id), false);
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "POLICY_RESUMED",
      metadata: { policyId: policy.id }
    });
    res.json(policy);
  }));

  router.post("/policies/:id/archive", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const policy = await services.policy.archive(req.auth!.userId, param(req.params.id));
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "POLICY_UPDATED",
      metadata: { policyId: policy.id, status: policy.status }
    });
    res.json(policy);
  }));

  router.delete("/policies/:id", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    await services.policy.delete(req.auth!.userId, param(req.params.id));
    res.status(204).send();
  }));

  router.post("/emergency-stop", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const count = await services.policy.setPaused(req.auth!.userId, true);
    const cancelled = await services.task.cancelPendingForUser(req.auth!.userId, "EMERGENCY_KILL_SWITCH_TRIGGERED");
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "EMERGENCY_STOP_TRIGGERED",
      metadata: {
        count,
        cancelled,
        reasonCode: "EMERGENCY_KILL_SWITCH_TRIGGERED",
        reasonCodes: ["EMERGENCY_KILL_SWITCH_TRIGGERED"],
        severity: "CRITICAL",
        storyClass: "EMERGENCY_STOP"
      }
    });
    res.json({ emergencyStopped: true, pausedPolicies: count, cancelled });
  }));

  router.post("/emergency-resume", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const count = await services.policy.setPaused(req.auth!.userId, false);
    await services.audit.log({
      userId: req.auth!.userId,
      eventType: "EMERGENCY_STOP_CLEARED",
      metadata: {
        count,
        reasonCode: "EMERGENCY_KILL_SWITCH_CLEARED",
        reasonCodes: ["EMERGENCY_KILL_SWITCH_CLEARED"],
        severity: "INFO",
        storyClass: "EMERGENCY_STOP"
      }
    });
    res.json({ emergencyStopped: false, resumedPolicies: count });
  }));

  router.get("/emergency-status", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const policies = await services.policy.list(req.auth!.userId);
    const pausedPolicies = policies.filter((policy) => policy.emergencyPaused || policy.status === "PAUSED").length;
    res.json({
      emergencyStopped: pausedPolicies > 0,
      pausedPolicies
    });
  }));

  router.post("/tasks", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const task = await services.task.createTask(req.auth!.userId, req.auth!.walletAddress, req.body);
    res.status(201).json(task);
  }));

  router.get("/tasks", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.task.listTasks(req.auth!.userId));
  }));

  router.get("/tasks/:id", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.task.getTask(req.auth!.userId, param(req.params.id)));
  }));

  router.post("/tasks/:id/clarify", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.task.clarifyTask(req.auth!.userId, req.auth!.walletAddress, param(req.params.id), req.body));
  }));

  router.post("/tasks/:id/cancel", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.task.cancelTask(req.auth!.userId, param(req.params.id)));
  }));

  router.post("/tasks/:taskId/actions/:actionId/approve", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.task.approveAction(req.auth!.userId, param(req.params.taskId), param(req.params.actionId)));
  }));

  router.post("/tasks/:taskId/actions/:actionId/reject", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.task.rejectAction(req.auth!.userId, param(req.params.taskId), param(req.params.actionId)));
  }));

  router.post("/tasks/:taskId/actions/:actionId/execute", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { signedPayload, useDemoWallet } = req.body as { signedPayload?: string; useDemoWallet?: boolean };
    res.json(
      await services.task.executeAction(
        req.auth!.userId,
        req.auth!.walletAddress,
        param(req.params.taskId),
        param(req.params.actionId),
        {
          signedPayload,
          useDemoWallet
        }
      )
    );
  }));

  router.get("/tasks/:id/replay", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const story = await services.story.buildTaskStory(req.auth!.userId, param(req.params.id));
    res.json(story);
  }));

  router.get("/tasks/:id/export", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query = taskExportQuerySchema.parse(req.query);
    const exported = await services.story.exportTaskStory(req.auth!.userId, param(req.params.id));
    await services.audit.log({
      userId: req.auth!.userId,
      taskId: param(req.params.id),
      eventType: "AUDIT_EXPORTED",
      metadata: {
        reasonCode: "AUDIT_STORY_EXPORTED",
        reasonCodes: ["AUDIT_STORY_EXPORTED"],
        severity: "INFO",
        storyClass: "AUDIT_EXPORT",
        format: query.format
      }
    });

    if (query.format === "markdown") {
      res.type("text/markdown").send(exported.markdown);
      return;
    }

    res.json(exported.story);
  }));

  router.get("/audit", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query = auditQuerySchema.parse(req.query);
    res.json(await services.audit.listByUser(req.auth!.userId, query));
  }));

  router.get("/audit/:id", requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await services.audit.getById(req.auth!.userId, param(req.params.id)));
  }));

  return router;
}
