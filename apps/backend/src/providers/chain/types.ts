import type { ExecutionRequest, ProposedAction, SimulationResult } from "@deadhand/types";

export interface PreparedExecution {
  request: ExecutionRequest;
  summary: string;
}

export interface BroadcastResult {
  success: boolean;
  txHash: string | null;
  error: string | null;
  gasUsed?: string | null;
}

export interface ChainProvider {
  prepare(action: ProposedAction, walletAddress: string): Promise<PreparedExecution>;
  simulate(request: ExecutionRequest): Promise<SimulationResult>;
  broadcast(signedPayload: string): Promise<BroadcastResult>;
}
