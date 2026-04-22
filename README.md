# Deadhand

**A policy-enforcement layer for AI agents making blockchain transactions.**

Deadhand sits between an AI agent and your wallet. Every proposed action is evaluated against a deterministic policy engine before execution reaches the signing layer. The AI proposes. Deadhand decides. You sign.

```
AI agent   →   Deadhand policy engine   →   Your wallet
  plans         evaluates / vetoes           signs only
                                             approved actions
```

---

## Trust Model

The trust model is the product. Three layers with strict role separation:

| Layer | Role | Authority |
|---|---|---|
| AI (Claude) | Interprets your natural language goal, proposes candidate actions | **None** — advisory only |
| Deadhand | Evaluates each action against compiled policy rules. Issues hard vetoes, approval gates, or auto-approvals | **Decision authority** |
| Wallet (MetaMask) | Signs and broadcasts only what Deadhand approved | **Execution authority** |

**The AI is never the authority.** It cannot override a veto, approve its own actions, or modify policy. This separation is architectural, not just a claim.

---

## What Deadhand Does

- **Hard vetoes** — Actions that violate policy (e.g., transfer amount exceeds limit, destination address not on allowlist) are blocked deterministically. No override is possible.
- **Approval gates** — Actions in grey zones (e.g., above threshold but within daily limit) are flagged for manual approval before execution.
- **Auto-approval** — Actions clearly within policy bounds are approved automatically and proceed to signing.
- **Drift detection** — Monitors for action sequences that individually pass policy but collectively indicate drift from the original intent.
- **Full audit trail** — Every decision (approve, block, require-approval) is logged with the policy rule that triggered it, the AI reasoning, and a timestamp.
- **Emergency stop** — One-click halt that suspends all operations immediately. Resumable via the same control.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vite + React 18 + TypeScript)                    │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Landing  │  │  App shell   │  │  Demo page         │    │
│  │ Hero     │  │  Dashboard   │  │  Guided 6-step     │    │
│  │ TrustModel  │  Policies    │  │  walkthrough       │    │
│  └──────────┘  │  Tasks       │  └────────────────────┘    │
│                │  Audit/Replay│                             │
│                └──────────────┘                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ /api proxy
┌──────────────────────────▼──────────────────────────────────┐
│  Backend (Express + TypeScript)                port 3001     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Auth        │  │ Policy engine│  │ Task executor     │  │
│  │ EIP-191 sig │  │ NL→compile   │  │ Plan→actions      │  │
│  │ JWT issue   │  │ Rule eval    │  │ Action eval       │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Prisma ORM → PostgreSQL                             │    │
│  │ Policies · Tasks · Actions · AuditEvents            │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AI layer (Claude via Anthropic API)                 │    │
│  │ BYOK model — your API key, your usage               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
              BNB Testnet (chain ID 97)
```

### Key design decisions

- **No wagmi/RainbowKit** — direct `window.ethereum` only. No WalletConnect project ID required for the demo.
- **JWT persisted locally** — auth is stored in frontend localStorage via Zustand persistence for local demo continuity. Server-side session revocation still applies on logout.
- **Vite proxy + local CORS** — frontend proxies `/api` to `localhost:3001`, and the backend also allows the local dev/preview origins explicitly.
- **BYOK AI** — the Anthropic API key is your own. No shared inference budget.
- **Demo-wallet exception for testnet proof only** — the default product remains non-custodial, but a dedicated local-only demo wallet path exists for guarded testnet verification.

---

## Safety Guarantees

1. **Policy is compiled, not interpreted at runtime** — natural language intent is compiled to an enforceable artifact with explicit rules before any task runs. The compiler output is shown to you (the Policy Compiler Receipt) before activation.

2. **Double-check before broadcast** — the execution guard re-evaluates policy and preflights the transaction before broadcasting, even for previously approved actions.

3. **Audit is append-only** — every policy decision is written to the audit log. Nothing is deleted. You can replay any task sequence.

4. **Emergency stop propagates instantly** — activating the kill switch sets the `stopped` flag on the backend. All subsequent action evaluations return `BLOCKED` regardless of policy.

---

## Demo Flow

The demo page (`/app/demo`) walks through all 6 enforcement states in order:

| Step | What it shows |
|---|---|
| 1. Compile policy | Natural language → enforceable rules. See the Policy Compiler Receipt. |
| 2. Safe transaction | Auto-approved: action within policy limits. Proceeds immediately. |
| 3. Hard veto | Blocked: exceeds transfer limit. VetoCard shows exact rule triggered. |
| 4. Approval gate | Requires manual confirmation before execution. |
| 5. Kill switch | Emergency stop halts all operations. Banner appears across all pages. |
| 6. Replay | Step through the full task history with policy decisions at each action. |

---

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally
- MetaMask browser extension
- Anthropic API key

### 1. Clone and install

```bash
git clone <repo>
cd deadhand
npm install
```

### 2. Configure environment

Copy the repo-root env template:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://deadhand:deadhand@localhost:5432/deadhand?schema=public"
JWT_SECRET="your-long-random-secret-min-32-chars"
ANTHROPIC_API_KEY="sk-ant-..."
DEMO_WALLET_ADDRESS="0x..."
DEMO_WALLET_PRIVATE_KEY="..."
```

### 3. Run database migrations

```bash
npm run prisma:migrate:dev
```

Optional readiness check:

```bash
npm --prefix apps/backend run check:readiness
```

### 4. Start dev servers

```bash
# Terminal 1 — backend
npm --prefix apps/backend run dev

# Terminal 2 — frontend
npm --prefix apps/frontend run dev -- --host 127.0.0.1 --port 5173
```

Frontend: `http://127.0.0.1:5173`  
Backend: `http://localhost:3001`

### 5. Connect wallet

Open `http://127.0.0.1:5173`, click **Connect wallet**, approve in MetaMask. Switch MetaMask to **BNB Testnet** (chain ID 97, RPC: `https://data-seed-prebsc-1-s1.bnbchain.org:8545`).

---

## Netlify Deployment

The frontend is deployment-ready for Netlify as a static SPA. The current Netlify-linked workspace is `apps/frontend/`.

Build truth:
- linked-workspace build command: `npm run build`
- linked-workspace publish directory: `dist`
- SPA routing is handled by:
  - root [netlify.toml](/Users/vinaysharma/deadhand/netlify.toml), which is now aligned to the linked frontend workspace
  - [apps/frontend/netlify.toml](/Users/vinaysharma/deadhand/apps/frontend/netlify.toml)
  - [apps/frontend/public/_redirects](/Users/vinaysharma/deadhand/apps/frontend/public/_redirects)

Required production frontend env:
- `VITE_API_BASE_URL`
  - set this to the public backend base URL, for example `https://your-backend.example.com`
  - without it, the deployed frontend would default to `/api`, which only works in local Vite proxy mode

Important deployment note:
- local development still uses the Vite proxy by default
- production/Netlify should use `VITE_API_BASE_URL`

---

## Project Structure

```
deadhand/
  apps/
    frontend/          Vite + React app
      src/
        api/           API client + typed request functions
        components/    UI primitives, layout, trust surfaces, landing
        hooks/         TanStack Query hooks (usePolicy, useTask, useAudit, ...)
        lib/           motion.ts, utils.ts
        pages/         Route-level page components
        store/         Zustand stores (auth, emergency, ui)
        styles/        globals.css + design tokens
    backend/           Express app
      src/
        api/           Route handlers
        services/      Policy engine, task executor, AI planner
        domain/        Types and validation
        lib/           DB client, AI client, wallet utils
        middleware/     Auth, error handling
  docs/                Architecture and migration notes
```

---

## Design System

Deadhand uses a bespoke dark design system. Key tokens:

| Token | Value | Usage |
|---|---|---|
| `bg` | `#0A0A0B` | Page background |
| `amber` | `#D4A843` | Brand accent, CTAs, active states |
| `danger` | `#C0392B` | Vetoes, blocked actions, error states |
| `success` | `#27AE60` | Auto-approved, valid receipts |
| `steel` | `#6B7FA3` | Secondary info, AI layer |
| `surface-1` | `#111113` | Card backgrounds |
| `surface-2` | `#18181B` | Input backgrounds, nested panels |

Fonts: **Barlow Semi Condensed** (display), **Epilogue** (body), **JetBrains Mono** (mono/code)

---

## License

MIT
