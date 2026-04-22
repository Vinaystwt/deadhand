import { apiClient } from "./client";

export interface DecisionTrigger {
  ruleType: string;
  reasonCode: string;
  severity: string;
  field: string;
  operator: string;
  expected?: unknown;
  actual?: unknown;
  triggerPath: string;
  humanExplanation: string;
  machineExplanation: string;
  safeAlternative: string | null;
  requiredCorrection: string | null;
}

export interface DecisionReceipt {
  decision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
  primaryReasonCode: string;
  reasonCodes: string[];
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  humanExplanation: string;
  machineExplanation: string;
  attempted: {
    actionType: string;
    adapter: string;
    label: string;
    estimatedCostBnb: string;
    targetContractAddress: string | null;
    targetTokenAddress: string | null;
    destinationAddress: string | null;
    slippageBps: number;
  };
  triggers: DecisionTrigger[];
  safeAlternative: string | null;
  requiredCorrection: string | null;
}

export interface SafetyCard {
  estimatedSpendBnb: string;
  valueAtRiskBnb: string;
  contractsTouched: string[];
  tokensTouched: string[];
  approvalScope: string;
  simulationResult: {
    status: "PENDING" | "PASSED" | "FAILED" | "SKIPPED";
    success: boolean;
    gasEstimate: string | null;
    error: string | null;
  };
  riskSummary: string;
  reasonCodes: string[];
  approvalRequired: boolean;
  killSwitchActive: boolean;
}

export interface Action {
  id: string;
  order: number;
  actionType: string;
  adapter: string;
  targetContractAddress: string | null;
  targetTokenAddress: string | null;
  destinationAddress: string | null;
  amountBnb: string | null;
  amountTokenUnits: string | null;
  slippageBps: number;
  estimatedCostBnb: string;
  label: string;
  calldata: string | null;
  metadata: Record<string, unknown>;
  status: string;
  policyDecision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
  decisionReceipt: DecisionReceipt | null;
  safetyCard: SafetyCard | null;
  approvedExecutionEnvelope?: unknown;
  driftReceipt?: unknown;
}

export interface Task {
  id: string;
  userId: string;
  policyId: string;
  policyVersion: number;
  naturalLanguageGoal: string;
  parsedIntent?: {
    goalType: string;
    clarificationNeeded: boolean;
    clarificationQuestion: string | null;
    totalBudgetBnb: string | null;
    targetTokenSymbol: string | null;
  };
  status: "PENDING" | "NEEDS_CLARIFICATION" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FAILED";
  actions: Action[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteResponse {
  task: Task;
  execution: {
    success: boolean;
    txHash?: string;
    explorerUrl?: string;
    error?: string;
    gasUsed?: string;
  };
}

export const taskApi = {
  list: async (): Promise<Task[]> => {
    const { data } = await apiClient.get("/tasks");
    return data;
  },

  get: async (id: string): Promise<Task> => {
    const { data } = await apiClient.get(`/tasks/${id}`);
    return data;
  },

  create: async (policyId: string, goal: string): Promise<Task> => {
    const { data } = await apiClient.post("/tasks", { policyId, goal });
    return data;
  },

  clarify: async (taskId: string, answer: string): Promise<Task> => {
    const { data } = await apiClient.post(`/tasks/${taskId}/clarify`, { answer });
    return data;
  },

  cancel: async (taskId: string): Promise<Task> => {
    const { data } = await apiClient.post(`/tasks/${taskId}/cancel`);
    return data;
  },

  approveAction: async (taskId: string, actionId: string): Promise<Task> => {
    const { data } = await apiClient.post(`/tasks/${taskId}/actions/${actionId}/approve`);
    return data;
  },

  rejectAction: async (taskId: string, actionId: string): Promise<Task> => {
    const { data } = await apiClient.post(`/tasks/${taskId}/actions/${actionId}/reject`);
    return data;
  },

  executeAction: async (
    taskId: string,
    actionId: string,
    options: { signedPayload?: string; useDemoWallet?: boolean }
  ): Promise<ExecuteResponse> => {
    const { data } = await apiClient.post(`/tasks/${taskId}/actions/${actionId}/execute`, options);
    return data;
  },

  replay: async (taskId: string): Promise<ReplayStory> => {
    const { data } = await apiClient.get(`/tasks/${taskId}/replay`);
    return data;
  },

  exportJson: async (taskId: string): Promise<ReplayStory> => {
    const { data } = await apiClient.get(`/tasks/${taskId}/export?format=json`);
    return data;
  },

  exportMarkdown: async (taskId: string): Promise<string> => {
    const { data } = await apiClient.get(`/tasks/${taskId}/export?format=markdown`);
    return data;
  },
};

export interface ReplayStory {
  taskId: string;
  policyId: string;
  goal: string;
  status: string;
  steps: ReplayStep[];
  generatedAt: string;
}

export interface ReplayStep {
  type: string;
  title: string;
  reasonCodes: string[];
  summary: string;
  payload: Record<string, unknown>;
}
