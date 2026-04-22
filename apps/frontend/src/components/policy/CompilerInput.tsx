import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CompilerReceipt } from "@/components/trust/CompilerReceipt";
import { policyApi, type CompilerReceipt as CompilerReceiptType } from "@/api/policy";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";

const EXAMPLE_INTENTS = [
  "Safe DeFi: max 0.5 BNB per tx, require approval above 0.1 BNB, no exotic tokens",
  "Launch trading bot: auto-approve swaps under 1 BNB, block transfers out, 2% max slippage",
  "Treasury lockdown: require manual approval for everything, no automated execution",
];

interface CompilerInputProps {
  presetKey?: string;
  onCompiled: (receipt: CompilerReceiptType) => void;
}

export function CompilerInput({ presetKey, onCompiled }: CompilerInputProps) {
  const [text, setText] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [receipt, setReceipt] = useState<CompilerReceiptType | null>(null);
  const toast = useToast();

  async function handleCompile() {
    if (!text.trim()) return;
    setCompiling(true);
    try {
      const result = await policyApi.compile(text, presetKey);
      setReceipt(result);
      onCompiled(result);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCompiling(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-mono text-text-tertiary block mb-2">
          Describe your policy in plain English
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="e.g. I want to safely trade on PancakeSwap. Maximum 0.5 BNB per transaction. Require my approval for anything above 0.1 BNB. Block any tokens I haven't approved..."
          className="w-full bg-surface-2 border border-border-subtle rounded-card px-3 py-2.5 text-sm font-sans text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-amber/50 resize-none transition-colors"
        />
      </div>

      <div>
        <p className="text-2xs font-mono text-text-tertiary mb-2">Examples:</p>
        <div className="space-y-1.5">
          {EXAMPLE_INTENTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="block w-full text-left text-2xs font-sans text-text-tertiary hover:text-text-secondary bg-surface-2/50 hover:bg-surface-2 border border-border-subtle rounded px-3 py-1.5 transition-colors"
            >
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleCompile}
        disabled={!text.trim() || compiling}
        loading={compiling}
        className="w-full"
      >
        {compiling ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Compiling policy...
          </>
        ) : (
          <>
            <Sparkles size={13} />
            Compile to enforceable rules
          </>
        )}
      </Button>

      {receipt && (
        <div className="mt-2">
          <CompilerReceipt receipt={receipt} />
        </div>
      )}
    </div>
  );
}
