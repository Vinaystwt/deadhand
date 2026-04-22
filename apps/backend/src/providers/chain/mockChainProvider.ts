import { executionRequestSchema, simulationResultSchema } from "@deadhand/types";
import type { ChainProvider, PreparedExecution } from "./types.js";

export class MockChainProvider implements ChainProvider {
  async prepare(action: any, walletAddress: string): Promise<PreparedExecution> {
    const gasLimit =
      action.adapter === "FOUR_MEME" ? "380000" : action.actionType === "TRANSFER_NATIVE" ? "21000" : "250000";
    const valueWei =
      action.amountBnb === "2.0"
        ? "2000000000000000000"
        : action.amountBnb === "0.1"
          ? "100000000000000000"
          : action.amountBnb === "0.05"
            ? "50000000000000000"
            : "0";

    return {
      request: executionRequestSchema.parse({
        from: walletAddress,
        to: action.targetContractAddress ?? action.destinationAddress ?? "0x3333333333333333333333333333333333333333",
        data: action.calldata,
        valueWei,
        gasLimit,
        chainId: 97,
        nonce: null
      }),
      summary: action.label
    };
  }

  async simulate(request: any) {
    const failed = request.to === "0x0000000000000000000000000000000000000000";
    return simulationResultSchema.parse({
      success: !failed,
      status: failed ? "FAILED" : "PASSED",
      error: failed ? "Mock simulation failed: zero address target" : null,
      gasEstimate: request.gasLimit ?? "210000",
      logs: failed
        ? ["Mock simulation rejected zero-address target."]
        : [
            `Prepared mock ${request.data ? "contract" : "native"} execution`,
            `Estimated gas ${request.gasLimit ?? "210000"}`
          ]
    });
  }

  async broadcast(_signedPayload: string) {
    return {
      success: true,
      txHash: "0xmockeddeadhandtxhash",
      error: null,
      gasUsed: "21000"
    };
  }
}
