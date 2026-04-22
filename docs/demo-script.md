# Deadhand Demo Script

Target length: 4–5 minutes. Recorded screencast, no live audio sync required.

---

## Pre-execution Checklist

Before starting the recording:

**Services**
- [ ] Backend running: `cd apps/backend && npm run dev` → port 3001 shows `Server running`
- [ ] Frontend running: `cd apps/frontend && npm run dev` → port 5173
- [ ] PostgreSQL running locally
- [ ] `ANTHROPIC_API_KEY` set in `apps/backend/.env`

**Browser state**
- [ ] MetaMask installed and unlocked
- [ ] MetaMask network set to **BNB Testnet** (chain ID 97)
- [ ] MetaMask has the demo account selected (not a mainnet account with real funds)
- [ ] No other tabs open to `localhost:5173` (avoid stale auth state)
- [ ] Browser zoom at 100%, devtools closed
- [ ] Open `localhost:5173` — should show landing page, not app

**Data state**
- [ ] Database seeded or clean — no leftover tasks from previous runs
- [ ] No active emergency stop in the database (run `POST /emergency-resume` if needed)
- [ ] At least one policy preset available (`GET /api/policies/presets` returns items)

**Fallback plan**
- If policy compile fails: have a pre-compiled policy ID ready to paste in the demo page
- If MetaMask popup doesn't appear: check that the demo account is unlocked and on testnet
- If backend 500: check PostgreSQL connection and re-run migrations

---

## Demo Script

### [0:00–0:30] Opening — The problem

**Show:** Landing page (`localhost:5173`)

**Say:**
> "AI agents are getting good at planning blockchain transactions. But 'good at planning' is not the same as 'safe to execute.'  
> When an AI agent proposes to move your funds, something has to decide if that's actually OK. That something shouldn't be the AI itself.  
> This is Deadhand."

**Action:** Scroll slowly down the landing page — pause at the trust model section (three nodes: AI interprets / Deadhand decides / You sign).

**Say:**
> "Three layers. Strict role separation. The AI proposes. Deadhand — a deterministic policy engine — decides. You sign. The AI has no authority in this chain. None."

---

### [0:30–1:00] Auth

**Show:** Landing page hero

**Say:**
> "Let me connect and walk you through the full enforcement flow."

**Action:** Click **Connect wallet** → MetaMask popup → approve → wait for redirect to `/app/dashboard`

**Say:**
> "Non-custodial. The backend issues a JWT but never touches private keys. Your wallet signs locally."

---

### [1:00–1:45] Policy creation — Compile step

**Show:** Navigate to `/app/demo` from the sidebar (Demo)

**Say:**
> "The demo page walks through every enforcement state. Let's start by creating a policy."

**Action:** Click **Step 1: Compile policy intent**. The compile panel should be visible.

**Say:**
> "Policies aren't written as code. You describe your intent in plain language. The policy engine compiles it to enforceable rules."

**Action:** The demo page has a pre-filled intent. Click **Compile**. Wait for the spinner and Policy Compiler Receipt to appear.

**Say:**
> "This is the Compiler Receipt. It shows you exactly what rules were extracted from your intent — the action types, the thresholds, the decision type for each rule. This is what Deadhand will enforce. Nothing ambiguous."

**Pause briefly on the receipt to let viewers read the rules.**

---

### [1:45–2:15] Auto-approved action

**Show:** Demo page, Step 2 (safe transaction)

**Action:** Click **Step 2: Submit safe task**. Watch the task flow.

**Say:**
> "This is a small swap — well within the policy limits. Watch the decision."

**Action:** Wait for the task to process. The action should show as AUTO_APPROVED with a green SafetyCard.

**Say:**
> "Auto-approved. The policy engine evaluated the action, confirmed it was within bounds, and cleared it without any human input required. Full audit log entry created."

---

### [2:15–2:55] Hard veto — the main event

**Show:** Demo page, Step 3 (large transfer)

**Action:** Click **Step 3: Submit blocked task**. Wait for processing.

**Say:**
> "Now let's try something the policy explicitly forbids. This is a transfer of 10 BNB — way above the configured limit."

**Wait for the VetoCard to appear.**

**Say:**
> "Blocked. This is a hard veto. Not a warning, not a suggestion — blocked. The card shows you exactly which rule triggered it, the limit, and the actual value that violated it."

**Action:** Point at the trigger grid showing Field / Limit / Actual values.

**Say:**
> "There's no override. No 'proceed anyway' button. The AI cannot circumvent this. Deadhand decided, and that decision is final."

---

### [3:00–3:30] Approval gate

**Show:** Demo page, Step 4 (approval required)

**Action:** Click **Step 4: Submit approval task**. Wait for processing.

**Say:**
> "Some actions aren't clearly safe or clearly blocked — they're in a grey zone. This one exceeds a per-transaction threshold but stays under the daily limit. Deadhand requires your explicit approval."

**Action:** Click **Approve** on the ApprovalGate component.

**Say:**
> "Manual approval gates are a middle layer between auto-approve and hard veto. You maintain oversight without needing to approve every single action."

---

### [3:30–4:00] Kill switch

**Show:** Demo page, Step 5 (kill switch)

**Say:**
> "If something looks wrong — unexpected behavior, a compromised agent, an unusual sequence of actions — you have a kill switch."

**Action:** Click the **Kill Switch** button in the top-right of the TopBar. Confirm in the dialog.

**Show:** The HALTED badge appears in the TopBar. The amber EmergencyBanner drops down across the app.

**Say:**
> "Emergency stop. All operations are suspended immediately. No new actions can be executed. Every page in the app shows this banner."

**Action:** Navigate to Dashboard — banner is still visible.

**Say:**
> "This isn't just a frontend state — the backend enforces it. Any action evaluation while stopped returns blocked, regardless of policy."

**Action:** Return to the demo page, click **Resume** in the banner to clear the stop state.

---

### [4:00–4:30] Audit log + replay

**Show:** Navigate to `/app/audit`

**Say:**
> "Every policy decision is logged. Every veto, every approval, every auto-pass. Append-only. This is your audit trail."

**Action:** Show a few rows of the audit log — blocked and approved events side by side.

**Show:** Navigate to `/app/replay`

**Say:**
> "And you can replay any task — step through the action sequence and see the policy decision at each step. Useful for post-incident review or understanding why an agent behaved a certain way."

---

### [4:30–5:00] Close

**Show:** Return to landing page

**Say:**
> "Deadhand gives you a hard boundary between AI planning and execution. The trust model is the product — three layers, strict separation, no AI authority over decisions.  
> Policy-first. Auditable. Non-custodial.  
> The agent plans. Deadhand decides."

**End.**

---

## Timing Notes

- Compile step: ~5–10s API call — leave natural silence, don't narrate through it
- Task processing: ~3–8s — same, let it breathe
- VetoCard reveal has a spring animation (~0.5s) — pause before speaking to let it land
- EmergencyBanner drop animation is ~0.35s — brief pause, then narrate
- Total with natural pacing: 4:30–5:00
