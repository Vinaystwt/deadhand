import {
  compilePolicyRequestSchema,
  type CompilePolicyRequest,
  createPolicyRequestSchema,
  policyCompilerReceiptSchema,
  type Policy,
  type PolicyCompilerReceipt
} from "@deadhand/types";
import { derivePolicyRules } from "../../domain/policy.js";
import { HttpError } from "../../lib/httpError.js";
import { validatePolicyInput } from "../../domain/policyValidation.js";
import type { PolicyRepository } from "../../domain/types.js";
import { AIService } from "../ai/aiService.js";
import { PolicyPresetService } from "./presetService.js";

export class PolicyService {
  constructor(
    private readonly policies: PolicyRepository,
    private readonly aiService: AIService,
    private readonly presetService: PolicyPresetService
  ) {}

  async list(userId: string): Promise<Policy[]> {
    return this.policies.listByUser(userId);
  }

  async get(policyId: string): Promise<Policy> {
    const policy = await this.policies.getById(policyId);
    if (!policy) {
      throw new HttpError(404, "Policy not found");
    }

    return policy;
  }

  async create(userId: string, input: unknown): Promise<Policy> {
    const parsed = createPolicyRequestSchema.parse(input);
    const policy: Policy = {
      ...parsed,
      id: crypto.randomUUID(),
      userId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    validatePolicyInput(policy);
    return this.policies.create(policy);
  }

  async update(userId: string, policyId: string, input: unknown): Promise<Policy> {
    const existing = await this.get(policyId);
    if (existing.userId !== userId) {
      throw new HttpError(403, "Policy does not belong to current user");
    }

    const parsed = createPolicyRequestSchema.parse(input);
    const policy: Policy = {
      ...existing,
      ...parsed,
      version: existing.version + 1,
      updatedAt: new Date().toISOString()
    };

    validatePolicyInput(policy);
    return this.policies.update(policyId, policy);
  }

  async setPaused(userId: string, paused: boolean): Promise<number> {
    return this.policies.pauseAll(userId, paused);
  }

  async setPolicyPaused(userId: string, policyId: string, paused: boolean): Promise<Policy> {
    const existing = await this.get(policyId);
    if (existing.userId !== userId) {
      throw new HttpError(403, "Policy does not belong to current user");
    }

    return this.policies.setPaused(policyId, userId, paused);
  }

  async archive(userId: string, policyId: string): Promise<Policy> {
    const existing = await this.get(policyId);
    if (existing.userId !== userId) {
      throw new HttpError(403, "Policy does not belong to current user");
    }

    return this.policies.archive(policyId, userId);
  }

  async delete(userId: string, policyId: string): Promise<void> {
    const existing = await this.get(policyId);
    if (existing.userId !== userId) {
      throw new HttpError(403, "Policy does not belong to current user");
    }

    await this.policies.delete(policyId, userId);
  }

  listPresets() {
    return this.presetService.list();
  }

  async compilePolicy(userId: string, walletAddress: string, input: CompilePolicyRequest | unknown): Promise<PolicyCompilerReceipt> {
    const parsed = compilePolicyRequestSchema.parse(input);
    const translated = await this.aiService.translatePolicy(parsed.text);
    const preset = parsed.presetKey ? this.presetService.get(parsed.presetKey) : null;
    if (parsed.presetKey && !preset) {
      throw new HttpError(404, "Policy preset not found");
    }

    const compiledPolicy: Policy = {
      walletAddress,
      name: preset?.policy.name ?? "Compiled Deadhand Policy",
      description: preset?.policy.description ?? "Compiled from natural-language policy intent",
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
      simulationRequired: true,
      emergencyPaused: false,
      status: "ACTIVE",
      version: 1,
      userId,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(preset ? this.presetService.applyPreset(preset.key, walletAddress) : {}),
      ...translated
    };

    let validationErrors: string[] = [];
    try {
      validatePolicyInput(compiledPolicy);
    } catch (error) {
      validationErrors = [error instanceof Error ? error.message : "Unknown policy validation error"];
    }

    const compiledRules = derivePolicyRules(compiledPolicy).map((rule) => ({
      ruleType: rule.ruleType,
      decision: rule.decision,
      explanation: rule.explanation
    }));

    return policyCompilerReceiptSchema.parse({
      originalIntent: parsed.text,
      presetKey: preset?.key ?? null,
      presetName: preset?.name ?? null,
      compiledPolicy: {
        name: compiledPolicy.name,
        description: compiledPolicy.description,
        approvalThresholdBnb: compiledPolicy.approvalThresholdBnb,
        maxTransactionBnb: compiledPolicy.maxTransactionBnb,
        maxDailySpendBnb: compiledPolicy.maxDailySpendBnb,
        maxSlippageBps: compiledPolicy.maxSlippageBps,
        allowedContractAddresses: compiledPolicy.allowedContractAddresses,
        blockedContractAddresses: compiledPolicy.blockedContractAddresses,
        allowedActionTypes: compiledPolicy.allowedActionTypes,
        blockedActionTypes: compiledPolicy.blockedActionTypes,
        simulationRequired: compiledPolicy.simulationRequired,
        status: compiledPolicy.status
      },
      compiledRules,
      validation: {
        valid: validationErrors.length === 0,
        reasonCode: validationErrors.length === 0 ? "POLICY_COMPILER_VALID" : "POLICY_COMPILER_INVALID",
        errors: validationErrors
      },
      structuredRuleSummary: compiledRules.map(
        (rule) => `${rule.ruleType}: ${rule.decision} - ${rule.explanation}`
      ),
      enforceableArtifact: {
        artifactType: "DEADHAND_POLICY_V1",
        compilerVersion: "1",
        ruleCount: compiledRules.length
      }
    });
  }
}
