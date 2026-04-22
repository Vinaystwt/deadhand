# Deadhand Upgrade Packet

## Project Name

Deadhand

## One-Sentence Summary

Deadhand is a backend-first, non-custodial policy-gated execution layer that lets AI plan BNB/Four.Meme launch operations while a deterministic engine blocks unsafe actions before they can execute.

## Problem Statement

AI agents are becoming useful for crypto operations, but the trust model is broken. If a user gives an agent unrestricted wallet authority, the downside is catastrophic. If the user manually approves every low-level step, the agent stops being useful. The missing primitive is a policy layer between AI planning and wallet execution.

## Why This Matters Now

- Agentic finance is becoming real faster than trust infrastructure is maturing.
- Meme-token launch operations are time-sensitive and operationally messy.
- Crypto-native users want speed, but they will not hand over blind wallet authority.
- Judges and users immediately understand the fear: “AI tried to overspend my wallet.”
- Deadhand turns that fear into the core product moment: “The policy engine blocked it.”

## Hackathon Context And Why This Project Fits

Deadhand is a strong hackathon project because it is easy to explain, visually powerful in demo form, and technically credible underneath:

- It has a crisp 30-second pitch.
- Both AI and crypto are structurally necessary, not decorative.
- The core trust guarantee is real and defensible.
- The demo path naturally produces a strong “block” moment.
- The architecture supports a roadmap beyond the MVP without feeling like a toy.

## Product Thesis

The right way to make AI useful in crypto is not to give it a wallet. It is to give it a constrained execution surface.

Deadhand’s thesis is:

1. The AI should be good at interpreting natural language and proposing actions.
2. The AI should not be trusted to decide what is safe.
3. Safety decisions must be deterministic, inspectable, and enforced before execution.
4. The user must remain in control of execution authority.

This makes Deadhand a trust layer for agentic crypto rather than a bot, wallet, or trading system.

## Trust Model

Deadhand’s trust model is the core product:

- Non-custodial by default.
- The deterministic policy engine is the authority on allow/block behavior.
- The LLM is not in the critical safety path.
- Execution is re-checked by an execution guard immediately before broadcast.
- The user remains the signer in the intended product model.
- A dedicated demo-wallet path exists for controlled testnet verification only and does not change the trust thesis.
- Every important state transition is recorded in the audit trail.

## Why AI Is Necessary

AI is necessary for:

- parsing natural-language goals into structured intent
- turning intent into candidate action plans
- translating user-supplied natural-language policy ideas into machine-readable policy structures
- generating plain-English risk explanations that make execution plans legible

Without AI, the user is back to manually planning and parameterizing every operation.

## Why Crypto / BNB / Four.Meme Context Is Necessary

Crypto is not an aesthetic setting here. It is the environment where the trust problem becomes acute.

- Wallet authority is real and dangerous.
- Execution targets are contracts, routers, token addresses, and chain state.
- BNB Chain is a practical execution environment for launch-style operations.
- Four.Meme is the right launch-context normalization for the intended use case.
- PancakeSwap is the natural surrounding DEX context for later-stage routing/liquidity behavior.

Without crypto, Deadhand would be a generic approvals engine. With BNB/Four.Meme, it becomes a meaningful trust primitive for agentic onchain operations.

## Exact MVP Scope

Deadhand’s current MVP scope is:

- backend-first system only
- no frontend implementation yet
- BNB Chain testnet runtime
- provider-agnostic AI layer with Anthropic as the real runtime option
- deterministic policy engine
- durable Postgres-backed state
- real BNB preflight/simulation via viem
- task orchestration from goal -> intent -> plan -> policy evaluation -> simulation -> approval/execution
- append-first audit trail
- emergency controls
- dedicated testnet demo-wallet path for controlled verification

The core loop is:

1. create a policy
2. submit a goal
3. get blocked and approval-gated actions
4. approve what is allowed
5. pass execution guard
6. inspect the audit trail

## What Is Already Built

### Core backend

- Express backend with authenticated API routes
- shared domain contracts in `packages/types`
- Prisma schema, migration, and DB-backed repositories
- Docker-based local Postgres path

### Deterministic safety core

- policy validation
- deterministic policy evaluation
- structured Deadhand veto receipts
- emergency pause logic
- emergency kill-switch cancellation behavior
- approval threshold logic
- contract/token/action allow/block handling
- daily spend and transaction-limit enforcement
- reason-code taxonomy across safety-critical flows
- intent-to-call drift lock

### Runtime orchestration

- auth challenge/verify/logout flow
- task creation, clarification, cancellation, approval, rejection, execution
- policy preset and launch guard pack system
- policy compiler receipts for natural-language policy interpretation
- safety cards / blast-radius previews on actions
- replayable audit story generation
- human-readable Markdown export and machine-readable JSON export
- durable approval and execution records
- audit append and read endpoints
- explorer-link-ready execution metadata

### Providers

- mock AI provider
- real Anthropic provider behind the same interface
- mock chain provider
- real viem-backed BNB testnet provider

### Verification utilities

- unit tests
- in-memory HTTP integration tests
- DB-backed integration tests
- adversarial demo gauntlet
- Anthropic smoke test
- external wiring smoke test

## Strongest Current Demo Flow

The strongest backend-driven demo flow available right now is:

1. User authenticates with wallet challenge/signature.
2. User creates a conservative launch policy.
3. User submits a natural-language launch goal.
4. AI produces candidate actions.
5. Deadhand returns:
   - at least one blocked action with a rich veto receipt
   - at least one approval-gated action with a safety card
6. User approves an allowed action.
7. Deadhand re-runs execution guard simulation on real BNB testnet and drift-locks the execution envelope.
8. The system stores audit events, replayable story steps, and execution metadata.
9. The demo shows a clear decision trail: proposed -> veto or approval gate -> guarded -> recorded -> exportable.

This is already strong even before funded live send verification.

## Architecture Overview

### High-level architecture

Frontend-agnostic client -> Deadhand backend -> [Anthropic provider, viem BNB RPC, PostgreSQL]

### Main modules

- `apps/backend/src/services/auth`
- `apps/backend/src/services/policy`
- `apps/backend/src/services/policy/presetService.ts`
- `apps/backend/src/services/task`
- `apps/backend/src/services/execution`
- `apps/backend/src/services/audit`
- `apps/backend/src/services/story`
- `apps/backend/src/services/demoWallet`
- `apps/backend/src/providers/ai`
- `apps/backend/src/providers/chain`
- `apps/backend/src/domain/deadhand.ts`
- `apps/backend/src/lib/prismaRepositories.ts`
- `packages/types/src/index.ts`

### Runtime shape

- Postgres-backed persistence
- viem-backed BNB testnet provider
- Anthropic as real BYOK AI option
- mock AI preserved as fallback
- external launch integrations kept adapterized where details are not yet safe to hard-lock

## Deterministic Policy Engine As The Moat

Deadhand’s moat is not “AI for crypto.” That is too generic.

The moat is the deterministic policy engine plus execution guard:

- it separates AI usefulness from AI trust
- it creates a clear trust boundary judges can understand
- it gives a precise answer to “why is this safe?”
- it now produces explicit veto receipts, safety cards, drift locks, and replayable audit proofs
- it produces a product primitive other agentic systems could eventually adopt

This is the part that turns the project from a demo bot into infrastructure.

## What Is Intentionally Out Of Scope Right Now

- frontend implementation
- multi-chain support
- smart-contract policy enforcement
- portfolio analytics
- trading-bot behavior
- notification systems
- Redis-based infra extras
- broad production SRE hardening
- hard-locking external contracts before confidence exists

These cuts are deliberate. The project wins by being crisp, not broad.

## What Is Still Adapterized / Externally Blocked

### Adapterized

- exact Four.Meme contract/router/factory details
- exact PancakeSwap router lock-in
- contract-specific launch-call builders

### Externally blocked

- funded demo-wallet live broadcast verification
- final live proof of one exact launch-style contract interaction

These are not architecture gaps. They are external-certainty and funding dependencies.

## Current Risks And Constraints

- The strongest remaining backend risk is not internal architecture; it is contract-detail certainty.
- The strongest remaining demo risk is not logic; it is the absence of funded-wallet proof and exact launch-contract lock-in.
- The frontend “wow” moments are still deferred, so the product story currently lives more in system behavior than visual drama.
- The backend handoff docs are current, but the future frontend still needs richer state-by-state UI examples.

## Why This Can Win

Deadhand can win because it sits at the intersection of real pain, clear trust language, and high demo legibility.

- It solves a problem users and judges already feel viscerally.
- The core product story is sharp: “AI tried something risky. Policy blocked it.”
- The deterministic engine gives the project credibility.
- The architecture shows real engineering depth without over-building.
- The product direction is expandable without being bloated.

## Open Upgrade Surface

These are the best places to improve Deadhand next without breaking the product thesis:

- sharpen the demo narrative and sequence
- make the “blocked” moment more legible and dramatic
- improve the audit-trail story and judge comprehension
- harden or enrich launch-specific adapter behavior once contract certainty exists
- add one or two high-signal trust or demo features that increase wow factor without broadening scope
- improve frontend handoff clarity so the next implementation phase can move fast
- refine preset naming/copy for maximum judge legibility

## What Kinds Of Upgrades We Want Next

We are entering a winning-probability optimization phase, not a random feature-addition phase.

We want upgrade suggestions that are:

- high impact
- low integration risk
- tightly aligned with Deadhand’s thesis
- likely to improve judge reaction, clarity, trust, demo strength, or wow factor
- coherent with the current architecture
- feasible without derailing the working backend

We do **not** want upgrades that:

- bloat the product
- muddle the trust model
- make it feel like a generic crypto dashboard
- introduce large new integration surfaces without clear payoff
- turn the project into a random feature pile

## Request For Upgrade Suggestions

Please propose upgrades for Deadhand with the following constraints:

1. Preserve the current product thesis.
2. Preserve the deterministic policy engine as the trust boundary.
3. Do not assume a frontend rewrite or architecture reset.
4. Prefer additions that amplify clarity, trust, explainability, or demo impact.
5. Prefer upgrades that can fit naturally into the existing backend-first system.
6. Distinguish between:
   - must-do upgrades
   - high-leverage optional upgrades
   - nice-to-have polish

The best answers will identify which improvements most increase Deadhand’s odds of feeling like a winning hackathon project rather than just a competent backend.
