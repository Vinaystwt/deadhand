import { useState } from "react";
import { Wallet, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

interface WalletConnectProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "amber" | "outline";
  onSuccess?: () => void;
  redirectTo?: string;
}

export function WalletConnect({
  size = "md",
  variant = "primary",
  onSuccess,
  redirectTo = "/app",
}: WalletConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  async function connect() {
    if (!window.ethereum) {
      setError("No wallet detected. Please install MetaMask.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Request accounts
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      const address = accounts[0];
      if (!address) throw new Error("No account returned.");

      // Get challenge
      const challenge = await authApi.challenge(address);

      // Sign message
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, address],
      })) as string;

      // Verify
      const result = await authApi.verify(address, signature);
      const userId = result.session?.userId ?? result.userId;
      if (!userId) {
        throw new Error("Auth response did not include a user id.");
      }

      setAuth(address, result.token, userId);
      toast.success("Connected.");

      onSuccess?.();
      navigate(redirectTo);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(`Connection failed: ${msg}`);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant={variant} size={size} onClick={connect} loading={connecting}>
        {!connecting && <Wallet size={size === "lg" ? 16 : 14} />}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-danger-bright">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span className="font-sans">{error}</span>
        </div>
      )}
    </div>
  );
}
