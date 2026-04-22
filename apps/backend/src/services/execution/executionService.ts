import type { ExecutionRequest, Policy, ProposedAction } from "@deadhand/types";
import { HttpError } from "../../lib/httpError.js";
import type { ChainProvider } from "../../providers/chain/types.js";
import type { DemoWalletService } from "../demoWallet/demoWalletService.js";

export class ExecutionService {
  constructor(
    private readonly chainProvider: ChainProvider,
    private readonly demoWalletService?: DemoWalletService
  ) {}

  async prepareAction(action: ProposedAction, walletAddress: string): Promise<ExecutionRequest> {
    const prepared = await this.chainProvider.prepare(action, walletAddress);
    return prepared.request;
  }

  async simulatePrepared(request: ExecutionRequest) {
    return this.chainProvider.simulate(request);
  }

  async broadcastSignedTransaction(signedPayload: string) {
    const result = await this.chainProvider.broadcast(signedPayload);
    if (!result.success) {
      throw new HttpError(400, result.error ?? "Broadcast failed");
    }

    return result;
  }

  async executeWithDemoWallet(request: ExecutionRequest, walletAddress: string) {
    if (!this.demoWalletService) {
      throw new HttpError(400, "Demo wallet execution is not available");
    }

    this.demoWalletService.assertAuthorizedWallet(walletAddress);
    const result = await this.demoWalletService.sendPreparedTransaction(request);
    if (!result.success) {
      throw new HttpError(400, result.error ?? "Demo wallet broadcast failed");
    }

    return result;
  }
}

export interface ExecutionGuardInput {
  policy: Policy;
  action: ProposedAction;
  policyDecision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
}
