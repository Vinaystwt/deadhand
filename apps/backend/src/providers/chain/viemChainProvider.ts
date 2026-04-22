import { parseEther, createPublicClient, http } from "viem";
import { executionRequestSchema, simulationResultSchema, type ExecutionRequest, type ProposedAction } from "@deadhand/types";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/httpError.js";
import { getConfiguredRouterForAdapter } from "../../domain/integrations.js";
import type { BroadcastResult, ChainProvider, PreparedExecution } from "./types.js";
import { bnbTestnetChain } from "./bnbChain.js";

function toValueWei(amountBnb: string | null | undefined): string {
  if (!amountBnb) {
    return "0";
  }
  return parseEther(amountBnb).toString();
}

export class ViemChainProvider implements ChainProvider {
  private readonly client = createPublicClient({
    chain: bnbTestnetChain,
    transport: http(env.BNB_RPC_URL)
  });

  async prepare(action: ProposedAction, walletAddress: string): Promise<PreparedExecution> {
    let to: string;

    if (action.adapter === "FOUR_MEME" || action.adapter === "PANCAKESWAP") {
      const configuredRouter = getConfiguredRouterForAdapter(action.adapter);
      if (!configuredRouter) {
        throw new HttpError(503, `${action.adapter} adapter is not configured for execution`, {
          adapter: action.adapter,
          targetContractAddress: action.targetContractAddress,
          hint: "Set the router address in local env before attempting live execution for this adapter."
        });
      }

      if (
        action.targetContractAddress &&
        action.targetContractAddress.toLowerCase() !== configuredRouter.toLowerCase()
      ) {
        throw new HttpError(400, `${action.adapter} action target does not match the configured router`, {
          adapter: action.adapter,
          configuredRouter,
          proposedTargetContractAddress: action.targetContractAddress
        });
      }

      to = configuredRouter;
    } else if (action.destinationAddress) {
      to = action.destinationAddress;
    } else if (action.targetContractAddress) {
      to = action.targetContractAddress;
    } else {
      throw new HttpError(400, "Action cannot be prepared because no execution target is available", {
        actionType: action.actionType,
        adapter: action.adapter,
        label: action.label
      });
    }

    const request = executionRequestSchema.parse({
      from: walletAddress,
      to,
      data: action.calldata,
      valueWei: toValueWei(action.amountBnb ?? action.estimatedCostBnb),
      gasLimit: null,
      chainId: env.BNB_CHAIN_ID,
      nonce: null
    });

    return {
      request,
      summary: action.label
    };
  }

  async simulate(request: ExecutionRequest) {
    try {
      const estimate = await this.client.estimateGas({
        account: request.from as `0x${string}`,
        to: request.to as `0x${string}`,
        data: request.data ? (request.data as `0x${string}`) : undefined,
        value: BigInt(request.valueWei)
      });

      if (request.data) {
        await this.client.call({
          account: request.from as `0x${string}`,
          to: request.to as `0x${string}`,
          data: request.data as `0x${string}`,
          value: BigInt(request.valueWei)
        });
      }

      return simulationResultSchema.parse({
        success: true,
        status: "PASSED",
        error: null,
        gasEstimate: estimate.toString(),
        logs: [`estimateGas=${estimate.toString()}`]
      });
    } catch (error) {
      return simulationResultSchema.parse({
        success: false,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown chain simulation error",
        gasEstimate: null,
        logs: []
      });
    }
  }

  async broadcast(signedPayload: string): Promise<BroadcastResult> {
    try {
      const txHash = await this.client.sendRawTransaction({
        serializedTransaction: signedPayload as `0x${string}`
      });
      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash
      });

      return {
        success: receipt.status === "success",
        txHash,
        error: receipt.status === "success" ? null : "Transaction reverted",
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      return {
        success: false,
        txHash: null,
        error: error instanceof Error ? error.message : "Unknown broadcast error",
        gasUsed: null
      };
    }
  }
}
