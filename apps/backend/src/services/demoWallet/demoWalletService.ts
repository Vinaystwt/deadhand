import { formatEther, createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ExecutionRequest } from "@deadhand/types";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/httpError.js";
import { bnbTestnetChain } from "../../providers/chain/bnbChain.js";
import type { BroadcastResult } from "../../providers/chain/types.js";

type DemoWalletConfig = {
  privateKey?: string;
  address?: string;
};

export class DemoWalletService {
  private readonly account;
  private readonly publicClient;
  private readonly walletClient;

  constructor(
    private readonly config: DemoWalletConfig = {
      privateKey: env.DEMO_WALLET_PRIVATE_KEY,
      address: env.DEMO_WALLET_ADDRESS
    }
  ) {
    this.account =
      this.config.privateKey && this.config.privateKey.startsWith("0x")
        ? privateKeyToAccount(this.config.privateKey as Hex)
        : this.config.privateKey
          ? privateKeyToAccount(`0x${this.config.privateKey}` as Hex)
          : null;

    this.publicClient = createPublicClient({
      chain: bnbTestnetChain,
      transport: http(env.BNB_RPC_URL)
    });

    this.walletClient = this.account
      ? createWalletClient({
          account: this.account,
          chain: bnbTestnetChain,
          transport: http(env.BNB_RPC_URL)
        })
      : null;

    if (this.account && this.config.address && this.account.address.toLowerCase() !== this.config.address.toLowerCase()) {
      throw new HttpError(500, "Configured demo wallet address does not match provided private key");
    }
  }

  isConfigured() {
    return Boolean(this.account);
  }

  getAddress() {
    return this.account?.address ?? this.config.address ?? null;
  }

  assertAuthorizedWallet(walletAddress: string) {
    const address = this.getAddress();
    if (!address) {
      throw new HttpError(400, "Demo wallet is not configured");
    }
    if (address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new HttpError(403, "Authenticated wallet does not match the configured demo wallet");
    }
  }

  async signAuthMessage(message: string) {
    if (!this.account) {
      throw new HttpError(400, "Demo wallet is not configured");
    }
    return this.account.signMessage({ message });
  }

  async getStatus() {
    const address = this.getAddress();
    if (!address) {
      return {
        configured: false,
        address: null,
        chainId: env.BNB_CHAIN_ID,
        rpcUrl: env.BNB_RPC_URL,
        balanceWei: null,
        balanceBnb: null,
        funded: false,
        ready: false
      };
    }

    const balance = await this.publicClient.getBalance({
      address: address as `0x${string}`
    });

    return {
      configured: this.isConfigured(),
      address,
      chainId: env.BNB_CHAIN_ID,
      rpcUrl: env.BNB_RPC_URL,
      balanceWei: balance.toString(),
      balanceBnb: formatEther(balance),
      funded: balance > 0n,
      ready: this.isConfigured()
    };
  }

  async sendPreparedTransaction(request: ExecutionRequest): Promise<BroadcastResult> {
    if (!this.account || !this.walletClient) {
      throw new HttpError(400, "Demo wallet is not configured");
    }

    const txHash = await this.walletClient.sendTransaction({
      account: this.account,
      to: request.to as `0x${string}`,
      data: request.data ? (request.data as `0x${string}`) : undefined,
      value: BigInt(request.valueWei),
      gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
      nonce: request.nonce ?? undefined,
      chain: bnbTestnetChain
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash
    });

    return {
      success: receipt.status === "success",
      txHash,
      error: receipt.status === "success" ? null : "Transaction reverted",
      gasUsed: receipt.gasUsed.toString()
    };
  }
}
