# Deadhand Backend Handoff

Deadhand is intentionally frontend-agnostic. The backend is already durable, BNB-testnet-wired, and AI-capable. The current frontend and any future frontend work should honor the contracts and trust model exposed here.

## Backend truth today

- Runtime persistence defaults to Prisma/Postgres.
- Real BNB testnet preflight runs through viem.
- Anthropic is available as the real AI provider through BYOK env wiring.
- Mock AI remains the safe fallback for tests, missing-key conditions, and temporary Anthropic provider failures.
- PancakeSwap now defaults to Deadhand's official BNB testnet router assumption for runtime readiness on chain `97`, while Four.Meme remains adapterized and env-configurable until exact contract details are confirmed. No fake placeholder addresses are used at runtime.
- A dedicated demo-wallet path exists for controlled testnet verification only.

## Frontend responsibilities later

## Frontend-critical route matrix

| Flow | Route | Method | Primary success shape |
| --- | --- | --- | --- |
| challenge | `/auth/challenge` | `POST` | `{ nonce, message, createdAt, expiresAt, ttlSeconds }` |
| verify | `/auth/verify` | `POST` | `{ token, userId, session }` |
| logout | `/auth/logout` | `POST` | `{ success: true }` |
| integration status | `/integrations/status` | `GET` | `{ ai, adapters, config }` |
| presets | `/policies/presets` | `GET` | `PolicyPreset[]` |
| compile policy | `/policies/compile` | `POST` | `PolicyCompilerReceipt` |
| create policy | `/policies` | `POST` | `Policy` |
| update policy | `/policies/:id` | `PUT` | `Policy` |
| pause policy | `/policies/:id/pause` | `POST` | `Policy` |
| resume policy | `/policies/:id/resume` | `POST` | `Policy` |
| create task | `/tasks` | `POST` | `TaskWithActions` |
| clarify task | `/tasks/:id/clarify` | `POST` | `TaskWithActions` |
| cancel task | `/tasks/:id/cancel` | `POST` | `TaskWithActions` |
| approve action | `/tasks/:taskId/actions/:actionId/approve` | `POST` | `TaskWithActions` |
| reject action | `/tasks/:taskId/actions/:actionId/reject` | `POST` | `TaskWithActions` |
| execute action | `/tasks/:taskId/actions/:actionId/execute` | `POST` | `{ task, execution }` |
| audit list | `/audit` | `GET` | `AuditEvent[]` |
| audit detail | `/audit/:id` | `GET` | `AuditEvent` |
| replay story | `/tasks/:id/replay` | `GET` | `ReplayStory` |
| export story | `/tasks/:id/export?format=json|markdown` | `GET` | `ReplayStory | string` |
| emergency status | `/emergency-status` | `GET` | `{ emergencyStopped, pausedPolicies }` |
| emergency stop | `/emergency-stop` | `POST` | `{ emergencyStopped, pausedPolicies, cancelled }` |
| emergency resume | `/emergency-resume` | `POST` | `{ emergencyStopped, resumedPolicies }` |

### Auth

- Connect an EVM wallet.
- Request a challenge from `POST /auth/challenge`.
- Have the wallet sign the returned message with `personal_sign`.
- Send the signature to `POST /auth/verify`.
- Persist the returned JWT for authenticated calls.
- Call `POST /auth/logout` when ending the session.

Example request:

```json
POST /auth/challenge
{
  "walletAddress": "0x94c188F8280cA706949CC030F69e42B5544514ac"
}
```

Example response:

```json
{
  "nonce": "uuid",
  "message": "Deadhand authentication\nwallet=0x94...\nnonce=...\nts=...\nexp=...",
  "createdAt": "2026-04-22T00:00:00.000Z",
  "expiresAt": "2026-04-22T00:05:00.000Z",
  "ttlSeconds": 300
}
```

### Policy flows

- List presets from `GET /policies/presets`.
- Optionally compile natural-language policy text through `POST /policies/compile`.
- Create policies with `POST /policies`.
- Read and edit policies through `GET /policies`, `GET /policies/:id`, `PUT /policies/:id`.
- Pause, resume, archive, and delete policies through the existing policy routes.

Preset discovery example:

```json
GET /policies/presets
[
  {
    "key": "launch-guard-safe",
    "name": "Launch Guard Pack: Safe Launch",
    "mode": "SAFE_LAUNCH",
    "summary": [
      "Low approval threshold for every meaningful spend",
      "Only launch-safe action types enabled"
    ]
  }
]
```

Compiler receipt example:

```json
POST /policies/compile
{
  "text": "Keep buys under 0.5 BNB and require approval above 0.1 BNB.",
  "presetKey": "launch-guard-safe"
}
```

Integration status example:

```json
GET /integrations/status
{
  "ai": {
    "configuredProvider": "anthropic",
    "anthropicConfigured": true,
    "model": "claude-haiku-4-5-20251001",
    "fallbackProvider": "mock"
  },
  "adapters": {
    "fourMeme": {
      "configured": false,
      "routerAddress": null,
      "factoryAddress": null,
      "planningEnabled": false,
      "executionReady": false
    },
    "pancakeSwap": {
      "configured": true,
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "routerSource": "default",
      "routerKind": "V3_SWAP_ROUTER",
      "planningEnabled": true,
      "executionReady": true
    }
  },
  "config": {
    "safeDemoModeReady": true,
    "fundedExecutionReady": true
  }
}
```

Runtime config truth:
- `GET /integrations/status` now also returns a `config` object that separates:
  - safe demo mode readiness
  - funded execution readiness
  - required-now env health
  - optional adapter/provider readiness
- `npm --prefix apps/backend run check:readiness` prints the same truth for operators and local debugging.

Notes:
- On BNB testnet, Deadhand now defaults PancakeSwap to the official PancakeSwap v3 SwapRouter listing for BSC testnet.
- `PANCAKESWAP_ROUTER_ADDRESS` still overrides that default if you want a different verified router.
- Four.Meme remains explicitly adapterized until a trustworthy router/factory pair is confirmed.

```json
{
  "originalIntent": "Keep buys under 0.5 BNB and require approval above 0.1 BNB.",
  "presetKey": "launch-guard-safe",
  "validation": {
    "valid": true,
    "reasonCode": "POLICY_COMPILER_VALID",
    "errors": []
  },
  "compiledRules": [
    {
      "ruleType": "MAX_TRANSACTION_BNB",
      "decision": "BLOCK",
      "explanation": "Action exceeds max transaction limit of 0.5 BNB."
    }
  ],
  "enforceableArtifact": {
    "artifactType": "DEADHAND_POLICY_V1",
    "compilerVersion": "1",
    "ruleCount": 11
  }
}
```

### Task flows

- Submit natural-language tasks to `POST /tasks`.
- Handle clarification state through `POST /tasks/:id/clarify`.
- Render actions with the following key backend-provided surfaces:
  - `policyDecision`
  - `decisionReceipt`
  - `safetyCard`
  - `approvedExecutionEnvelope`
  - `driftReceipt`
- Support approve/reject via:
  - `POST /tasks/:taskId/actions/:actionId/approve`
  - `POST /tasks/:taskId/actions/:actionId/reject`
- Execute through:
  - `POST /tasks/:taskId/actions/:actionId/execute`
- After a successful execution, task status is now advanced to `COMPLETED` once all actions are terminal. Frontend should treat that as the canonical "show replay/export entry point" state.

Create-task example:

```json
POST /tasks
{
  "policyId": "uuid",
  "goal": "Help me set up launch liquidity using about 2 BNB total"
}
```

Blocked-action example shape:

```json
{
  "policyDecision": "BLOCKED",
  "decisionReceipt": {
    "primaryReasonCode": "POLICY_VETO_MAX_TRANSACTION",
    "severity": "CRITICAL",
    "humanExplanation": "Deadhand vetoed this action. BLOCKED: proposed 2.0 BNB exceeds max transaction 0.5 BNB.",
    "triggers": [
      {
        "ruleType": "MAX_TRANSACTION_BNB",
        "triggerPath": "action.estimatedCostBnb",
        "safeAlternative": "Reduce the action size to 0.5 BNB or less."
      }
    ]
  }
}
```

Approval-gated action example shape:

```json
{
  "policyDecision": "REQUIRES_APPROVAL",
  "safetyCard": {
    "estimatedSpendBnb": "0.1",
    "valueAtRiskBnb": "0.1",
    "contractsTouched": ["<configured-router-address>"],
    "approvalScope": "User approval required above 0.05 BNB",
    "simulationResult": {
      "status": "PASSED",
      "success": true
    },
    "reasonCodes": [
      "POLICY_REQUIRES_APPROVAL_THRESHOLD",
      "SIMULATION_PASSED"
    ],
    "approvalRequired": true
  }
}
```

Execute request examples:

```json
POST /tasks/:taskId/actions/:actionId/execute
{
  "signedPayload": "0x..."
}
```

```json
POST /tasks/:taskId/actions/:actionId/execute
{
  "useDemoWallet": true
}
```

Demo-wallet execution note:

- `useDemoWallet` is only for controlled Deadhand demos on BNB testnet.
- It must never be presented as the default user path.
- The normal product path remains user-signed execution using a wallet-owned `signedPayload`.
- Frontend copy should frame `useDemoWallet` as “demo mode” or “operator demo wallet”, not general delegated custody.
- If an action references an unconfigured Four.Meme or Pancake adapter, frontend should treat it as plannable-but-not-executable until the adapter route is configured.

Execute response example:

```json
{
  "task": {
    "status": "COMPLETED"
  },
  "execution": {
    "success": true,
    "txHash": "0x...",
    "explorerUrl": "https://testnet.bscscan.com/tx/0x..."
  }
}
```

### Replay and audit

- Read audit events from `GET /audit` and `GET /audit/:id`.
- Replay task story from `GET /tasks/:id/replay`.
- Export human-readable or machine-readable stories from:
  - `GET /tasks/:id/export?format=json`
  - `GET /tasks/:id/export?format=markdown`

Audit query examples:

```text
GET /audit?eventType=POLICY_EVALUATED_BLOCK&limit=20
GET /audit?reasonCode=POLICY_VETO_MAX_TRANSACTION&limit=20
GET /audit?severity=CRITICAL&storyClass=POLICY_VETO&limit=20
GET /audit?taskId=<uuid>&storyClass=EXECUTION_GUARD&limit=20
```

### Emergency controls

- Expose the global kill switch through:
  - `GET /emergency-status`
  - `POST /emergency-stop`
  - `POST /emergency-resume`
- Make the kill-switch state visually unmistakable.
- Hydrate halted state from `GET /emergency-status` on shell/app load so refreshes preserve a truthful emergency banner.

## Trust-critical backend fields the frontend must surface clearly

### On blocked actions

- `decisionReceipt.primaryReasonCode`
- `decisionReceipt.severity`
- `decisionReceipt.humanExplanation`
- `decisionReceipt.triggers`
- `decisionReceipt.safeAlternative`
- `decisionReceipt.requiredCorrection`

### On approval-gated or executable actions

- `safetyCard.estimatedSpendBnb`
- `safetyCard.valueAtRiskBnb`
- `safetyCard.contractsTouched`
- `safetyCard.tokensTouched`
- `safetyCard.approvalScope`
- `safetyCard.simulationResult`
- `safetyCard.riskSummary`
- `safetyCard.reasonCodes`

### On execution

- `approvedExecutionEnvelope`
- `driftReceipt` when present
- execution result metadata
- explorer-link-ready execution URLs

## Important product/trust constraints for frontend later

- Do not make the AI look like the authority. The policy engine is the authority.
- Make blocked actions feel dramatic and final. That is a core product moment.
- Make approval feel informed and bounded, not generic.
- Keep user control visible at all times.
- Treat `useDemoWallet` as a demo-only path, not the default product trust model.
- Preserve the BNB/Four.Meme launch-operation framing. Do not turn the app into a generic trading dashboard.

## Recommended frontend state mapping

### Task states

- `PENDING`
- UI example: show planning/loading state
- `NEEDS_CLARIFICATION`
- UI example: show clarification prompt and disable action execution
- `ACTIVE`
- UI example: show action list with decisions and controls
- `COMPLETED`
- UI example: show success summary and explorer/audit links
- `CANCELLED`
- UI example: show halted state, especially after kill switch
- `FAILED`
- UI example: show terminal failure with replay/audit links

### Action states

- `PENDING`
- UI example: available for review, blocked display, or future execution path
- `APPROVED`
- UI example: approved and waiting for execute/sign path
- `REJECTED`
- UI example: user explicitly refused action
- `READY_TO_EXECUTE`
- UI example: optional future frontend state if you stage execution after approval
- `EXECUTING`
- UI example: broadcast/confirmation progress state
- `EXECUTED`
- UI example: confirmed and explorer-linked
- `FAILED`
- UI example: failed with reason code and replay link
- `CANCELLED`
- UI example: cancelled by user or emergency kill switch

### Policy decisions

- `BLOCKED`
- UI example: red Deadhand veto card using `decisionReceipt`
- `REQUIRES_APPROVAL`
- UI example: amber approval gate using `safetyCard`
- `AUTO_APPROVED`
- UI example: green/neutral low-friction card using `safetyCard`

### Story-class mapping

- `POLICY_VETO`
  - Best for blocked cards and denial moments
- `APPROVAL_GATE`
  - Best for approval cards
- `SIMULATION`
  - Best for preflight status rows
- `EXECUTION_GUARD`
  - Best for final recheck / drift lock messaging
- `EXECUTION_RESULT`
  - Best for execution status timeline
- `EMERGENCY_STOP`
  - Best for full-screen halted state or global banners
- `POLICY_COMPILER`
  - Best for policy compiler receipt surfaces
- `AUDIT_EXPORT`
  - Best for export/download history

## Remaining backend-side external dependencies

- exact Four.Meme contract/router/factory certainty

Everything else needed for frontend integration is already in place or adapterized cleanly.
