# Deadhand Frontend Master Handoff

This document is the master frontend transfer artifact for Deadhand. It is written so a new LLM or engineer can understand the product, the backend, the trust model, the intended UX, the current constraints, and the right workflow for taking over the frontend phase.

Use this as the primary frontend handoff document. Then inspect the repo and the referenced backend docs before proposing or implementing anything.

## 1. Project Identity

- Project name: Deadhand
- One-line summary: Deadhand is a backend-first, non-custodial policy execution layer that lets users safely use AI to plan BNB/Four.Meme launch operations while a deterministic engine blocks unsafe actions.
- Full thesis:
  - AI is useful for parsing goals, interpreting policies, planning actions, and explaining risk.
  - AI is not trustworthy enough to be the execution authority.
  - Deadhand’s core product is the deterministic trust boundary between AI planning and wallet execution.
  - The user remains in control, the policy engine enforces, and the audit trail proves what happened.
- Why this project exists:
  - Crypto operators want speed under time pressure.
  - They do not want to hand unrestricted wallet authority to an AI agent.
  - Today the choice is usually unsafe automation or slow manual execution.
  - Deadhand creates the middle ground: AI planning with deterministic, auditable enforcement.
- Why it matters in the hackathon context:
  - The concept is explainable in seconds.
  - The blocked-action moment is visually and emotionally strong.
  - The product has real technical depth without requiring smart-contract complexity.
  - It combines AI and crypto in a way where both are structurally necessary, not decorative.

## 2. Product Evolution

### Original idea / direction

The original execution plan was for an “Agent Safety Policy Wallet” in a meme-coin launch context. It was initially written around a Solana stack:

- Phantom wallet
- Solana transaction simulation
- Jupiter / Raydium routing
- Solana Explorer
- SPL token assumptions

The frontend direction in that original plan was:

- dashboard-first experience
- policy creation flow
- agent task submission flow
- action review / approval flow
- audit visibility
- a dramatic blocked-action demo moment
- a lightweight onboarding walkthrough

### How it changed over time

The project was normalized from Solana to BNB/Four.Meme semantics:

- EVM wallet auth replaced Solana wallet assumptions
- BNB testnet / viem replaced Solana RPC assumptions
- Four.Meme + Pancake adapter boundaries replaced Jupiter / Raydium assumptions
- contract allowlists replaced program allowlists
- BscScan semantics replaced Solana Explorer semantics

The product also sharpened from “policy wallet” into `Deadhand`, a clearer branded trust layer with stronger demo language and more explicit safety surfaces.

### What remained constant

These things never changed:

- backend-first scope
- non-custodial model
- deterministic policy engine as the real authority
- AI can plan but cannot decide
- execution must be rechecked before broadcast
- auditability is first-class
- the product is meant to feel like trust infrastructure, not a trading bot

### Why Deadhand is the final direction

Deadhand is the final direction because it is:

- sharper as a product story
- more memorable for judges
- more honest about the trust problem
- more visually and experientially strong for a frontend build
- better aligned with a “high-trust control room” product surface than the more generic original naming

## 3. Core Trust Model

This is the most important section for the frontend. The UI must make this legible.

### AI role

AI is allowed to:

- parse user goals
- interpret natural-language policy intent
- generate candidate actions
- explain risk in plain language

AI is not allowed to:

- decide whether an action is safe
- bypass policy
- bypass execution guard
- silently change what the user approved

### Deterministic policy role

The deterministic policy engine is the enforcement authority.

It decides whether an action is:

- `BLOCKED`
- `REQUIRES_APPROVAL`
- `AUTO_APPROVED`

It emits structured reasoning, including:

- reason codes
- violated rules
- severity
- veto triggers
- safe alternatives or corrections where applicable

### Execution guard role

Even after approval, Deadhand does a final execution-guard recheck before broadcast.

This includes:

- execution-envelope comparison
- simulation / preflight checks
- drift detection
- final blocking if the final call shape materially differs from what was approved

### Audit / replay role

Deadhand records the safety story, not just the result.

The audit and replay layers capture:

- goal
- parsed intent
- candidate actions
- veto or approval gate
- simulation
- execution-guard recheck
- final result
- emergency stop events

The frontend should treat replay as a core product surface, not a buried debugging detail.

### User control role

The user must remain visibly in control:

- they connect the wallet
- they sign auth challenges
- they review actions
- they approve or reject where required
- the product never pretends the AI is “in charge”

### Non-custodial principle

Deadhand is not a custodial wallet product.

There is a backend demo-wallet path for controlled testnet demos, but the frontend must frame that as:

- demo-only
- testnet-only
- not the default trust model

The normal product truth remains user-signed execution.

## 4. Current Backend Reality

This is what actually exists now.

### Major systems implemented

- Express backend
- Prisma/Postgres persistence
- viem-backed BNB testnet chain provider
- provider-agnostic AI abstraction
- Anthropic real provider
- mock AI fallback
- graceful Anthropic-to-mock runtime fallback for temporary provider failures
- deterministic policy engine
- policy presets
- policy compiler receipts
- task planning and orchestration
- Deadhand Veto receipts
- Safety Card / blast-radius previews
- drift lock / intent-to-call comparison
- replayable audit story
- JSON + Markdown export
- global emergency stop / resume
- demo wallet readiness path
- adversarial demo gauntlet

### Major services

- auth service
- policy service
- preset service
- task service
- execution service
- audit service
- story / replay service
- demo wallet service

### Major route groups

- auth:
  - `/auth/challenge`
  - `/auth/verify`
  - `/auth/logout`
- policy:
  - `/policies`
  - `/policies/presets`
  - `/policies/compile`
  - `/policies/:id`
  - `/policies/:id/pause`
  - `/policies/:id/resume`
  - `/policies/:id/archive`
- integration status:
  - `/integrations/status`
  - includes adapter state plus config-truth readiness for safe demo mode vs funded execution
- task and actions:
  - `/tasks`
  - `/tasks/:id`
  - `/tasks/:id/clarify`
  - `/tasks/:id/cancel`
  - `/tasks/:taskId/actions/:actionId/approve`
  - `/tasks/:taskId/actions/:actionId/reject`
  - `/tasks/:taskId/actions/:actionId/execute`
- replay / export:
  - `/tasks/:id/replay`
  - `/tasks/:id/export`
- audit:
  - `/audit`
  - `/audit/:id`
- emergency:
  - `/emergency-status`
  - `/emergency-stop`
  - `/emergency-resume`
- demo wallet:
  - `/demo-wallet/status`

### Adapter/runtime truth

- PancakeSwap now defaults to Deadhand's BNB testnet router assumption, so it appears as configured in runtime status on chain `97`.
- Four.Meme remains adapterized until exact contract details are trusted enough to hard-lock.
- The backend no longer uses fake placeholder router/factory addresses at runtime.
- If a Four.Meme router is not configured, planning can still proceed, but execution for that adapter is explicitly gated and surfaced as unconfigured.

### Major safety layers already implemented

- deterministic policy evaluation
- structured veto receipts
- approval gating
- safety cards
- simulation / preflight
- drift lock
- execution-guard recheck

Frontend implementation note:
- successful action execution now advances the parent task to `COMPLETED` when all actions are terminal
- the shell should hydrate emergency-halt state from `/emergency-status`, not from local-only assumptions
- shared dialogs should portal to `document.body` so app-shell overlays are not clipped by TopBar blur / stacking contexts
- emergency kill switch
- durable audit events
- replay story reconstruction

### Important current reality for frontend

- the backend is not speculative anymore
- the route surface is stable enough to build against
- some external contract details are still adapterized
- funded live wallet verification is already complete
- this should not block frontend work
- canonical local dev runtime is:
  - backend on `http://localhost:3001`
  - frontend on Vite `http://localhost:5173` by default, with fallback if the port is occupied
  - frontend dev proxy forwards `/api/*` to `http://localhost:3001` unless `VITE_API_BASE_URL` is explicitly set
  - production/Netlify should set `VITE_API_BASE_URL` to the public backend base URL

## 5. Repo / File / Doc Map For Frontend

These are the most frontend-relevant files and docs. Cloud Code should inspect them.

### Primary docs

- [docs/frontend-master-handoff.md](/Users/vinaysharma/deadhand/docs/frontend-master-handoff.md)
  - this document
- [docs/backend-handoff.md](/Users/vinaysharma/deadhand/docs/backend-handoff.md)
  - route contracts, examples, frontend-critical fields, state mappings
- [context.md](/Users/vinaysharma/deadhand/context.md)
  - full operational memory, decisions, blockers, secrets registry metadata, current status
- [README.md](/Users/vinaysharma/deadhand/README.md)
  - concise project overview, runtime shape, demo commands
- [docs/upgrade-packet.md](/Users/vinaysharma/deadhand/docs/upgrade-packet.md)
  - strong product narrative, current strengths, why this can win
- [docs/solana-to-bnb-replacement.md](/Users/vinaysharma/deadhand/docs/solana-to-bnb-replacement.md)
  - adaptation rationale and chain-specific normalization

### Key route and app wiring

- [apps/backend/src/api/routes.ts](/Users/vinaysharma/deadhand/apps/backend/src/api/routes.ts)
  - all route definitions the frontend will care about
- [apps/backend/src/index.ts](/Users/vinaysharma/deadhand/apps/backend/src/index.ts)
  - service wiring and app assembly

### Shared types and contracts

- [packages/types/src/index.ts](/Users/vinaysharma/deadhand/packages/types/src/index.ts)
  - the most important file for frontend state modeling
  - includes:
    - policy decisions
    - task and action statuses
    - reason codes
    - severities
    - safety card schemas
    - compiler receipt schema
    - replay story schema
    - audit query schema

### Trust and policy core

- [apps/backend/src/domain/policy.ts](/Users/vinaysharma/deadhand/apps/backend/src/domain/policy.ts)
  - deterministic policy engine
- [apps/backend/src/domain/deadhand.ts](/Users/vinaysharma/deadhand/apps/backend/src/domain/deadhand.ts)
  - receipt builders, safety cards, drift lock helpers
- [apps/backend/src/domain/policyValidation.ts](/Users/vinaysharma/deadhand/apps/backend/src/domain/policyValidation.ts)
  - policy validation rules

### Task orchestration and execution

- [apps/backend/src/services/task/taskService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/task/taskService.ts)
  - the main user-flow engine
- [apps/backend/src/services/execution/executionService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/execution/executionService.ts)
  - prepare, simulate, broadcast flow

### Audit / replay / export

- [apps/backend/src/services/audit/auditService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/audit/auditService.ts)
  - audit append and query
- [apps/backend/src/services/story/storyService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/story/storyService.ts)
  - replay story generation and Markdown export
- [apps/backend/src/domain/audit.ts](/Users/vinaysharma/deadhand/apps/backend/src/domain/audit.ts)
  - query helpers for reasonCode/severity/storyClass

### Policy setup surfaces

- [apps/backend/src/services/policy/policyService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/policy/policyService.ts)
  - policy CRUD and compiler receipts
- [apps/backend/src/services/policy/presetService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/policy/presetService.ts)
  - Launch Guard Pack presets

### Auth / session / wallet

- [apps/backend/src/services/auth/authService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/auth/authService.ts)
  - challenge/verify/logout behavior
- [apps/backend/src/services/demoWallet/demoWalletService.ts](/Users/vinaysharma/deadhand/apps/backend/src/services/demoWallet/demoWalletService.ts)
  - demo-wallet-only path

### Demo, verification, and adversarial proof

- [apps/backend/src/scripts/demoGauntlet.ts](/Users/vinaysharma/deadhand/apps/backend/src/scripts/demoGauntlet.ts)
  - adversarial scenarios; extremely useful for frontend demo understanding
- [apps/backend/src/scripts/demoFixtures.ts](/Users/vinaysharma/deadhand/apps/backend/src/scripts/demoFixtures.ts)
  - seed/demo context
- [apps/backend/tests/integration/http.test.ts](/Users/vinaysharma/deadhand/apps/backend/tests/integration/http.test.ts)
  - route-level behavior examples the frontend can rely on

## 6. Current Product Capabilities

From a user/system perspective, Deadhand can currently:

- authenticate a wallet with challenge + signature + JWT
- create, update, pause, resume, archive, and delete policies
- expose BNB/Four.Meme-native policy presets
- compile natural-language policy text into a deterministic compiler receipt
- submit natural-language tasks
- request clarification when goals are ambiguous
- generate candidate actions
- attach rich structured veto receipts to blocked actions
- attach safety cards to approval-gated or executable actions
- simulate actions before execution
- require approval above threshold
- recheck execution intent before broadcast
- block drifted execution attempts
- record audit events durably
- replay a task as a coherent safety story
- export replay in JSON or Markdown
- trigger a global emergency stop and resume
- expose demo-wallet readiness
- run adversarial scenarios that prove why the product exists

## 7. Current Limitations / Deferred Items

These should be clear to Cloud Code, but they should not block frontend work unless the UI tries to depend on them too early.

### Externally blocked

- exact Four.Meme contract/router/factory lock-in
- richer contract-specific Four.Meme adapter implementation
- final live proof of one exact launch-style interaction

### Intentionally deferred

- full frontend implementation
- browser wallet UX
- landing-page vs app-shell decision
- visual brand system
- clarification UX presentation
- full audit UI
- final polished demo choreography
- Redis-backed revocation/rate limiting
- deeper production hardening

### Important interpretation for frontend

The frontend should not block on:

- exact Four.Meme addresses
- funded demo wallet
- final contract-level interaction proof

Instead, it should:

- build around the current contracts
- keep adapterized areas clearly framed
- avoid hardcoding external contract certainty that does not yet exist

## 8. Frontend Goals

The frontend should optimize for:

- clarity
- trust legibility
- memorable veto moments
- informed approval moments
- replayability
- premium motion
- demoability
- calm control
- serious confidence
- coherent BNB/Four.Meme launch context

The frontend should feel like:

- a high-trust control room
- a safety instrument panel
- an intelligent but disciplined operator environment

It should not feel like:

- a meme-y retail crypto dashboard
- a generic AI assistant UI
- a cluttered security enterprise console
- a gaming interface

## 9. Recommended Frontend Surfaces

This is a recommended structure, not a mandatory navigation map.

### 1. Overview / Status surface

Purpose:

- establish immediate system confidence
- show whether Deadhand is healthy, paused, or ready
- surface active policy, recent task state, demo wallet status, and emergency state

Potential contents:

- active policy card
- latest task / latest replay entry
- emergency stop status
- connected wallet / demo wallet status
- quick links into policy, tasks, replay, exports

### 2. Policy Builder

Purpose:

- let the user create or edit deterministic safety policy

Needed modes:

- structured builder
- natural-language compiler flow

Expected UX:

- clear explanation of what Deadhand enforces
- presets first or prominently visible
- bounded sliders/inputs for transaction and daily caps
- contract/token allowlist affordances

### 3. Policy Compiler Receipt

Purpose:

- visualize the AI-to-deterministic transition

Show:

- original human intent
- compiled deterministic rules
- validation result
- structured rule summary
- final enforceable artifact

This should be a signature frontend moment. It tells the user: “AI interpreted this, Deadhand enforces this.”

### 4. Action Review / Approval Center

Purpose:

- review candidate actions in a ranked, legible way

Each action should clearly show:

- label
- action type
- policy decision
- safety card
- simulation outcome
- reason codes
- approval status

This is likely the operational center of the app.

### 5. Deadhand Veto Surface

Purpose:

- make blocked actions feel unmistakably blocked

Show:

- exact violated rule
- severity
- reason code
- human explanation
- attempted action summary
- what triggered the veto
- safe alternative / required correction

This should be dramatic, crisp, and unforgettable.

### 6. Safety / Blast Radius Preview

Purpose:

- make approval decisions informed, bounded, and calm

Show:

- estimated spend
- value at risk
- contracts touched
- assets touched
- approval scope
- simulation result
- risk summary
- whether approval is required

This should feel controlled and precise.

### 7. Audit / Replay Surface

Purpose:

- make the decision trail understandable

Show:

- timeline/story view
- step types
- reason codes
- execution-guard recheck
- final result
- emergency events if any

Treat this as a first-class product feature, not only a debug panel.

### 8. Audit Export Surface

Purpose:

- let the user inspect or export proof of what happened

Show:

- JSON export access
- Markdown export access
- clear explanation of why export matters

### 9. Demo Gauntlet Surface

Purpose:

- show adversarial proof
- help judges understand the product fast

Potential approach:

- dedicated scenario list
- run-through cards
- scenario output comparisons
- before/after or attempted/blocked framing

### 10. Emergency Controls

Purpose:

- make global stop/resume unmistakable

This should feel:

- strong
- interruptive
- immediate
- explicitly safety-critical

### 11. Wallet / Integrations / Environment State

Purpose:

- reduce ambiguity around wallet mode and runtime state

Show:

- connected wallet
- auth/session state
- demo-wallet mode if active
- network
- chain readiness
- adapterized external integrations as “configured vs unconfirmed”

## 10. UX Behavior Expectations

### What should feel calm

- overview/status
- policy editing before save
- safety-card reading
- replay browsing
- export access

### What should feel dramatic

- Deadhand veto
- emergency stop
- drift lock block
- adversarial demo scenarios

### What should feel dangerous

- broad execution attempts
- high-severity warnings
- emergency stop confirmation
- actions near or beyond policy thresholds

### What should feel safe

- compiler receipt validation
- bounded approvals
- simulation-passed cards
- replay proof after execution
- explicit user-controlled sign/approve steps

### Where motion should be subtle

- page transitions
- section reveals
- status pulses
- hover states
- list expansion
- replay timeline stepping

### Where motion should be emphatic

- veto card reveal
- emergency-stop activation
- drift lock denial
- approval gate expansion
- replay milestone transitions

### Where the user should be slowed down deliberately

- before approval
- before emergency stop
- when a veto occurs
- when compiler validation is invalid
- when a drift or simulation failure happens

### Where the user should feel confidence

- after successful auth
- when policy compiles cleanly
- when simulation passes
- when replay proves what happened
- when an executed action shows explorer-linked result

## 11. Motion / Visual Direction

This matters a lot.

The frontend should be:

- polished
- smooth
- motion-rich
- visually high quality
- full of tasteful graphics, transitions, animations, and moving parts
- serious and premium
- more like a high-trust control room than a generic dashboard

### Desired feel

- powerful
- intelligent
- alive
- safe
- premium
- controlled
- smooth

### Motion direction

We want:

- smooth transitions between states
- layered panels and depth
- staggered reveals where useful
- animated system-state changes
- meaningful motion, not generic motion
- responsive interaction feedback
- visually legible status changes

### Strong visual cues

- veto should feel like the system caught something dangerous
- approval should feel constrained, not casual
- replay should feel like reconstructing a verified incident timeline
- emergency stop should feel globally consequential

### Avoid

- neon gaming aesthetics
- childish “fun crypto app” styling
- tacky motion overload
- noisy effects that weaken trust
- meme-coin retail trading vibes
- generic AI SaaS dashboard blandness

The right visual reference is closer to:

- premium mission control
- safety operations console
- high-trust financial instrumentation

Not:

- cartoon crypto
- terminal cosplay
- generic admin UI

## 12. Demo Priorities

The frontend should emphasize these moments for a strong demo:

### 1. Veto moment

- “AI proposed this”
- “Deadhand vetoed it”
- exact rule and reason visible

### 2. Safe approval moment

- show a bounded approval-gated action
- show the safety card first
- make the user feel informed, not hurried

### 3. Replay story

- make the timeline legible and cinematic
- show goal -> parse -> plan -> veto/approval -> simulation -> guard -> result

### 4. Audit receipts

- structured receipts should look like evidence, not logs

### 5. Emergency stop

- make it look like a real system control, not just another button

### 6. Adversarial scenario proof

- show at least one or two scripted attack/failure cases
- help judges understand why the product exists

### 7. Core trust message

The frontend should make this sentence visually obvious:

- AI interprets
- Deadhand decides
- user signs

## 13. Original Execution-Plan Frontend Direction

These were the original frontend-related intentions from the initial execution plan, interpreted against the current backend reality.

### Original direction that still applies

- first-time onboarding / walkthrough
- dashboard-style landing surface after connect
- policy creation flow
- natural-language policy interpretation flow
- new task submission flow
- action-plan review flow
- blocked actions should be visually distinct and non-overridable
- approval flow for allowed but bounded actions
- audit log visibility
- emergency stop visibility

### Original intended user flow

The original plan described:

1. connect wallet
2. sign a challenge
3. land on dashboard
4. create policy
5. save policy
6. start task
7. enter goal
8. receive clarifying question if needed
9. see candidate actions with decision badges
10. review blocked/approval/autopass actions
11. approve eligible actions
12. execute
13. inspect audit trail

That flow still maps well to the backend today.

### Original onboarding direction

The original plan suggested:

- a lightweight walkthrough
- “Define a policy -> Agent proposes actions -> Policy enforces rules”
- optional starter preset

Updated interpretation:

- this is still a strong frontend pattern
- now it should probably use the current Launch Guard Pack presets and Policy Compiler Receipt

### Original policy creation direction

The plan called for:

- quick structured setup
- natural-language policy path
- editable interpreted rules

Updated interpretation:

- this is still correct
- the backend already supports compiler receipts and presets
- the frontend should preserve the idea that AI interpretation is editable before final save

### Original action review direction

The plan wanted:

- badges like blocked / requires approval / low risk
- risk explanation text
- estimated cost
- execution review

Updated interpretation:

- this is now stronger because the backend has:
  - Deadhand Veto receipts
  - Safety Cards
  - reason codes
  - drift lock
  - replay/export

### Original system behavior direction

The plan assumed:

- backend task state
- polling or refresh behavior
- visible action statuses

Updated interpretation:

- the frontend should still assume a backend-driven state machine
- no frontend logic should invent trust decisions on its own

### Original direction that is outdated

- Solana-specific wallet, routing, and simulation assumptions
- any frontend language that references Solana tools

These should be replaced with the current BNB/Four.Meme language and current backend contracts.

## 14. Frontend Non-Goals

The frontend should not become:

- a generic crypto trading dashboard
- a portfolio tracker
- a multi-chain wallet interface
- a meme-coin casino UI
- a generic AI chat app
- a portfolio analytics product
- an onchain explorer clone
- a bloated admin console

It should also not:

- invent backend logic that does not exist
- hardcode exact Four.Meme or Pancake assumptions unless confirmed in backend docs/config
- imply AI has authority it does not have
- frame the demo-wallet path as normal user custody flow

## 15. Questions Cloud Code Should Ask Us First

Before designing or building, Cloud Code should ask us the right questions about:

### Visual style

- Do we want the product to skew more cinematic or more restrained?
- Do we want a cleaner enterprise-trust feel or a more crypto-native premium feel?

### Dark / light direction

- Do we want dark mode only for the demo?
- Do we want both?
- If dark-first, how moody vs crisp should it be?

### Brand tone

- Should Deadhand feel colder and more security-infrastructure-like?
- Or slightly more crypto-native and dynamic?

### Typography feel

- Do we want sharp, technical typography?
- Or premium editorial weight mixed with technical UI type?

### Motion intensity

- How strong should the motion be?
- Do we want subtle premium motion or distinctly cinematic system transitions?

### UI density

- How dense should the app feel?
- More spacious control room, or tighter operational console?

### Product feel spectrum

- How far toward “security product” vs “crypto product” vs “control room” do we want the visual language?

### Surface strategy

- Do we want:
  - a landing page plus app shell
  - or just an app shell for the hackathon

### Graphics and visual assets

- Do we want abstract diagrams, grids, maps, topology lines, animated system overlays, or icon-led UI only?
- Do we want illustration at all, or purely system graphics?

### Microinteraction preference

- How tactile should buttons, cards, toggles, and transitions feel?
- How much motion do we want on veto/approval/replay transitions specifically?

## 16. Suggested Frontend Workflow For Cloud Code

Cloud Code should follow this process:

1. read this handoff document fully
2. inspect the repo and all referenced files/docs
3. inspect backend routes, shared types, replay/export surfaces, and task/policy contracts
4. ask us the design questions listed above
5. decide which design skills/tools it will use
6. produce a frontend strategy / workflow
7. produce a phase-wise frontend execution plan
8. wait for approval
9. implement the full frontend in one go
10. test thoroughly, including browser/live testing where appropriate
11. only then present the result

### Design/process note

Cloud Code should not jump directly into implementation.

The correct move is:

- understand the product
- understand the trust model
- understand the backend contracts
- get the design direction aligned
- then build

## 17. Frontend Handoff Checklist

Before Cloud Code starts implementation, it should verify:

- I have read `docs/frontend-master-handoff.md`
- I have read `docs/backend-handoff.md`
- I have read `context.md`
- I understand Deadhand’s trust model
- I understand the current backend route surface
- I understand that Four.Meme/Pancake exact details remain adapterized
- I understand that funded demo-wallet verification is still pending
- I understand that frontend must not invent backend safety logic
- I know which design questions to ask first
- I will propose a frontend strategy before building
- I will keep the UI premium, smooth, trust-heavy, and demo-friendly

## Final Guidance To Cloud Code

Deadhand should feel like a living safety system, not just a CRUD app on top of an API.

The frontend’s job is not only to render backend data. It is to make the product’s trust model emotionally and visually understandable:

- when something is blocked, the user should feel protected
- when something needs approval, the user should feel informed
- when something passes the guard, the user should feel confidence
- when the audit replays the story, the user should feel that Deadhand is proving its value

Build the frontend around that.
