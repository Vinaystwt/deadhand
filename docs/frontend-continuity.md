# Deadhand Frontend — Execution Memory & Continuity Document

This document is the single source of truth for the Deadhand frontend implementation phase. It is written so another agent (Claude, Codex, or otherwise) can resume the frontend at any point with full context. It covers direction, rationale, architecture, design system, motion, copy, phases, demo strategy, and testing plan.

---

## 1. Product Summary (Relevant To Frontend)

Deadhand is a backend-first, non-custodial policy execution layer for AI-assisted BNB/Four.Meme launch operations.

Trust model (must stay intact in the frontend):
- **AI interprets** — parses goals, generates candidate actions, explains risk
- **Deadhand decides** — deterministic policy engine blocks, gates, or approves
- **User signs** — user retains wallet authority throughout

The frontend must make this model emotionally legible, not just technically present.

Core backend is fully implemented, and the frontend app now exists in the repo as the active product surface. This document is continuity memory for the current frontend codebase plus the original intended direction.

Key backend surfaces the frontend consumes:
- Auth: challenge/verify/logout (EVM wallet signing)
- Policy: CRUD, presets, compiler receipts
- Tasks: create, clarify, cancel, approve/reject, execute
- Execution: action execution with drift lock and execution guard
- Audit/Replay: story reconstruction, JSON + Markdown export
- Emergency: status/stop/resume (global kill switch)
- Demo wallet: status endpoint (demo-only path)

Backend runs on Express at port 3001 by default. Frontend dev runs on Vite at port 5173 by default. All backend routes require JWT auth except `/auth/*` and `/health`.

Current local integration reality:
- frontend dev proxy forwards `/api/*` to `http://localhost:3001`
- frontend can also use `VITE_API_BASE_URL` for direct API calls if needed
- backend now includes local CORS handling for `localhost:5173` and preview origins
- backend now exposes `GET /integrations/status` so the frontend can distinguish configured adapters from adapterized-but-unconfirmed ones
- that runtime payload now also includes a `config` section for safe-demo-mode readiness vs funded-execution readiness
- backend now exposes `GET /emergency-status` so the frontend shell can hydrate halted state on page load / refresh
- Anthropic remains the real provider option, but backend runtime now falls back to mock if Anthropic is temporarily unavailable or returns a provider-level failure
- PancakeSwap now appears as configured by default on BNB testnet runtime, while Four.Meme remains explicitly adapterized until trustworthy contract details are confirmed
- the shared dialog primitive now portals to `document.body` so app-shell dialogs are not clipped by blurred/transformed ancestors in the authenticated shell
- the most reliable local startup commands are app-prefixed:
  - `npm --prefix apps/backend run dev`
  - `npm --prefix apps/frontend run dev -- --host 127.0.0.1 --port 5173`

---

## 2. Final Design Direction (Locked)

These decisions were confirmed by the project owner after reviewing design questions.

### Visual Language

| Dimension | Decision |
|-----------|----------|
| Tone | Controlled cinematic — surgical, high-stakes, alive |
| Identity spectrum | 60% crypto-premium / 40% enterprise-trust |
| Abstract graphics | Yes — topology lines, mesh traces, data-flow, signal fields |
| Theme | Dark only |
| Dark feel | Crisp near-black (obsidian/carbon/graphite), restrained warmth |
| Accent direction | Muted amber/signal gold primary, cold steel secondary |
| Avoid | AI-startup blue glow, generic gradients, rounded glassy SaaS aesthetic |

### Color Palette

```
Background (obsidian):   #0A0A0B
Surface-1 (cards):       #111113
Surface-2 (panels):      #18181C
Surface-3 (elevated):    #222228
Border-subtle:           #2A2A32
Border-medium:           #3A3A46

Primary accent (amber):  #D4A843
Amber dim:               #A07830
Amber glow:              rgba(212, 168, 67, 0.12)

Secondary (steel-blue):  #6B7FA3
Steel dim:               #4A5873

Danger (surgical red):   #C0392B
Danger dim:              #8B2520
Danger glow:             rgba(192, 57, 43, 0.12)

Success (controlled):    #27AE60
Success dim:             #1E7D45

Info (steel):            #8CA5C4

Text-primary:            #F0F0F2
Text-secondary:          #9898A5
Text-tertiary:           #5A5A6A
Text-inverse:            #0A0A0B

Overlay:                 rgba(10, 10, 11, 0.85)
```

### Typography Stack

```
Display/Editorial:  "Syne" (Google Fonts — geometric, premium, distinctive)
                    Weights: 600, 700, 800
                    Use: hero, page headers, major moment labels

UI/Body:            "Inter" (Google Fonts — highly legible, system-grade)
                    Weights: 400, 500, 600
                    Use: all interface content, labels, cards, descriptions

Mono/Technical:     "JetBrains Mono" (Google Fonts — clean technical mono)
                    Weights: 400, 500
                    Use: reason codes, hashes, tx IDs, calldata, technical values
```

Why this combination avoids the "AI-generated website" look:
- Syne is geometric but not the generic sans used in AI tools
- Inter is neutral and legible without being a "startup font"
- JetBrains Mono adds technical precision without terminal cosplay

### Spacing & Layout

Base unit: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

Max container width: 1280px
Content width (focused): 960px
Sidebar width (app): 240px

Corner radii:
- Cards: 8px
- Buttons: 6px
- Badges: 4px
- Inputs: 6px
- Modals: 12px

Borders: 1px solid border-subtle everywhere. Slightly brighter on hover/focus.

### Motion Direction

Philosophy: motion should feel like a precision instrument reacting, not a website animating.

Intensities:
- **Ambient**: subtle status pulses, breathing indicators (opacity 0.6–1.0 cycle)
- **Standard**: smooth page/card transitions, hover states, status updates
- **Cinematic**: Veto reveal, Safety Card expand, Kill Switch activation, Drift Lock block, Replay timeline reconstruction

Spring config for standard motion:
```
{ type: "spring", stiffness: 400, damping: 40 }
```

Spring config for cinematic entries:
```
{ type: "spring", stiffness: 280, damping: 30, mass: 1.2 }
```

Transition duration for fades/opacity: 150–250ms
Stagger child delay: 60ms per item

---

## 3. Frontend Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | React 18 + TypeScript | Standard, fast, ecosystem depth |
| Build tool | Vite | Fast HMR, no SSR overhead needed for wallet app |
| Styling | Tailwind CSS v3 | Utility-first, rapid design system |
| Animations | Framer Motion | Best-in-class React animation |
| Routing | React Router v6 | SPA routing with layout support |
| Server state | TanStack Query v5 | Polling, mutations, cache |
| Client state | Zustand | Auth state, emergency state, UI state |
| Wallet | wagmi v2 + viem | Matches backend's viem-based approach, EVM-native |
| Forms | react-hook-form + zod | Mirrors backend Zod schemas |
| Components | Custom + shadcn/ui base | Heavily customized to avoid generic look |
| Icons | Lucide React | Clean, consistent |
| HTTP client | Axios or fetch wrapper | Typed API client with JWT injection |

### Location

```
apps/frontend/
```

This is an npm workspace package within the monorepo.

---

## 4. Directory Structure

```
apps/frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx                      # Entry point
    ├── App.tsx                       # Router setup
    ├── api/                          # API layer
    │   ├── client.ts                 # Base axios client w/ JWT injection
    │   ├── auth.ts                   # Auth API calls
    │   ├── policy.ts                 # Policy API calls
    │   ├── task.ts                   # Task/action API calls
    │   ├── audit.ts                  # Audit API calls
    │   ├── emergency.ts              # Emergency stop/resume
    │   └── types.ts                  # Frontend-specific API response types
    ├── components/
    │   ├── ui/                       # Base design-system components
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Input.tsx
    │   │   ├── Textarea.tsx
    │   │   ├── Separator.tsx
    │   │   ├── Tooltip.tsx
    │   │   ├── Dialog.tsx
    │   │   ├── Tabs.tsx
    │   │   └── Spinner.tsx
    │   ├── trust/                    # Trust-critical components
    │   │   ├── VetoCard.tsx          # BLOCKED action — cinematic reveal
    │   │   ├── SafetyCard.tsx        # Blast radius preview
    │   │   ├── ApprovalGate.tsx      # Approval-gated action
    │   │   ├── AutoApprovedCard.tsx  # AUTO_APPROVED action
    │   │   ├── CompilerReceipt.tsx   # Policy compiler receipt visualizer
    │   │   ├── DriftLockAlert.tsx    # Drift lock block
    │   │   ├── PolicyDecisionBadge.tsx
    │   │   ├── SeverityBadge.tsx
    │   │   └── ReasonCodeChip.tsx
    │   ├── policy/
    │   │   ├── PolicyBuilder.tsx     # Create/edit policy form
    │   │   ├── PresetGrid.tsx        # Preset selector cards
    │   │   ├── PolicyCard.tsx        # Policy summary card
    │   │   └── CompilerInput.tsx     # Natural language → compile flow
    │   ├── task/
    │   │   ├── TaskSubmit.tsx        # Goal input form
    │   │   ├── TaskCard.tsx          # Task summary card
    │   │   ├── ActionList.tsx        # Action list with decisions
    │   │   ├── ActionCard.tsx        # Individual action card (unified)
    │   │   ├── ClarificationPrompt.tsx
    │   │   └── ExecuteModal.tsx      # Execute confirmation + sign
    │   ├── replay/
    │   │   ├── ReplayTimeline.tsx    # Cinematic audit story
    │   │   ├── ReplayStep.tsx        # Individual story step
    │   │   ├── ExportPanel.tsx       # JSON/Markdown export
    │   │   └── AuditEventRow.tsx     # Compact audit event
    │   ├── emergency/
    │   │   ├── EmergencyBanner.tsx   # Global stopped banner
    │   │   ├── KillSwitch.tsx        # Kill switch button + confirm
    │   │   └── EmergencyOverlay.tsx  # Full-screen halt state
    │   ├── wallet/
    │   │   ├── WalletConnect.tsx     # Connect button + flow
    │   │   ├── WalletStatus.tsx      # Connected wallet display
    │   │   └── DemoWalletBadge.tsx   # Demo-only indicator
    │   ├── layout/
    │   │   ├── AppShell.tsx          # Authenticated shell
    │   │   ├── Sidebar.tsx           # Navigation sidebar
    │   │   ├── TopBar.tsx            # Header
    │   │   └── PageHeader.tsx        # Consistent page header
    │   ├── landing/
    │   │   ├── Hero.tsx              # Landing hero
    │   │   ├── TrustModel.tsx        # Animated trust model diagram
    │   │   ├── FeatureShowcase.tsx   # Key features
    │   │   ├── HowItWorks.tsx        # Process flow
    │   │   ├── DemoProof.tsx         # Adversarial proof section
    │   │   └── Footer.tsx
    │   └── graphics/                 # Abstract system graphics
    │       ├── TopologyField.tsx     # Animated topology/mesh background
    │       ├── DataFlow.tsx          # Flow animation overlay
    │       └── PulseRing.tsx         # Ambient pulse indicator
    ├── hooks/
    │   ├── useAuth.ts                # Auth state + login flow
    │   ├── usePolicy.ts              # Policy queries + mutations
    │   ├── useTask.ts                # Task queries + mutations
    │   ├── useAudit.ts               # Audit queries
    │   ├── useEmergency.ts           # Emergency state
    │   └── useReplay.ts              # Replay/export
    ├── pages/
    │   ├── Landing.tsx               # / — Landing page
    │   ├── app/
    │   │   ├── Dashboard.tsx         # /app — Overview
    │   │   ├── PoliciesPage.tsx      # /app/policies
    │   │   ├── PolicyDetailPage.tsx  # /app/policies/:id
    │   │   ├── TasksPage.tsx         # /app/tasks
    │   │   ├── TaskDetailPage.tsx    # /app/tasks/:id
    │   │   ├── ReplayPage.tsx        # /app/replay/:taskId
    │   │   ├── AuditPage.tsx         # /app/audit
    │   │   └── DemoPage.tsx          # /app/demo — guided gauntlet
    ├── store/
    │   ├── authStore.ts              # Wallet address, JWT, session
    │   ├── emergencyStore.ts         # Kill switch state
    │   └── uiStore.ts                # Toast, modal, sidebar state
    ├── lib/
    │   ├── wagmi.ts                  # wagmi config + connectors
    │   ├── queryClient.ts            # TanStack Query client
    │   └── utils.ts                  # cn(), formatBnb(), truncateAddress()
    └── styles/
        └── globals.css               # Tailwind base + CSS custom properties
```

---

## 5. Routing Structure

```
/                               → Landing page
/app                            → Dashboard (protected)
/app/policies                   → Policy list
/app/policies/new               → Policy builder (create mode)
/app/policies/:id               → Policy detail + edit
/app/tasks                      → Task list + new task
/app/tasks/:id                  → Task detail + action review
/app/replay/:taskId             → Replay / audit story
/app/audit                      → Audit log (filterable)
/app/demo                       → Guided demo / gauntlet flow
```

Auth gate: all `/app/*` routes redirect to `/` if no valid JWT. JWT stored in memory via Zustand (authStore). On page refresh, user must reconnect (acceptable for hackathon scope).

---

## 6. Page-by-Page Specification

### Landing Page (`/`)

Sections in order:
1. **Hero** — Full-viewport. Strong headline copy. Animated topology field background. Trust tagline. Connect wallet CTA.
2. **Trust Model Diagram** — Animated 3-node flow: "AI interprets" → "Deadhand decides" → "User signs". Should feel like a living circuit.
3. **How It Works** — 6-step numbered sequence: Policy → Goal → Actions → Veto/Gate → Guard → Audit. Staggered reveal.
4. **Key Features** — 6 cards: Deadhand Veto, Safety Card, Policy Compiler, Drift Lock, Replay Story, Emergency Kill Switch. Each has icon, headline, 1–2 line description.
5. **Adversarial Proof** — Short section explaining the demo gauntlet scenarios. "We built an adversarial gauntlet that proves these blocks are real."
6. **Connect CTA** — Final full-width section. Strong statement + connect wallet button.

Copy anchors:
- Hero headline: "AI should plan. Not decide."
- Sub-headline: "Deadhand is the trust boundary between AI intent and wallet execution. Every unsafe action is blocked. Every decision is auditable."
- Trust model: "AI interprets / Deadhand decides / User signs"
- CTA: "Connect wallet to start"

### Dashboard (`/app`)

Purpose: system health at a glance.

Sections:
- System status bar (policy state, emergency state, wallet, network)
- Active policy card (name, key limits, version, status, quick pause/resume)
- Recent task (last task status, quick action links)
- Recent audit events (last 5, with storyClass icons)
- Quick actions: New Task, New Policy, View Replay

Emergency state: if kill switch is active, a full-width amber banner dominates the top of every app page.

### Policy Pages (`/app/policies`, `/app/policies/new`, `/app/policies/:id`)

List page:
- Card grid of existing policies with status badges
- Create new button
- Quick pause/resume/archive per policy

Create/Edit page:
Two modes:
1. **Preset mode** — choose from Launch Guard Pack presets (Safe Launch, Aggressive Launch, Treasury Lockdown). Selecting shows what each enforces.
2. **Build mode** — structured form fields (thresholds, allowlists, blocklists, action type controls)
3. **Compiler mode** — optional: enter natural language intent, run `/policies/compile`, see the Compiler Receipt, then save the resulting policy.

Compiler Receipt component:
- Original intent (quoted)
- Validation badge (VALID / INVALID)
- Compiled rules list (each with ruleType, decision, explanation)
- Enforcement artifact metadata
- "This is what Deadhand will enforce" statement
- Confirm and save button

The Compiler Receipt is a signature product moment. It should feel like watching a machine translate human language into law.

### Task Pages (`/app/tasks`, `/app/tasks/:id`)

Tasks list:
- List with status badges (PENDING, ACTIVE, NEEDS_CLARIFICATION, COMPLETED, CANCELLED, FAILED)
- New task button with goal input
- Each task links to detail

Task detail (`/app/tasks/:id`):
Main surface. This is the operational center.

Sections:
- Task header (goal, status, policy name, timestamp)
- If NEEDS_CLARIFICATION: clarification prompt card with answer input
- If ACTIVE or COMPLETED: Action list

Action list shows all actions. Each action has a decision badge (BLOCKED / REQUIRES_APPROVAL / AUTO_APPROVED) and opens into the appropriate card:

**BLOCKED → VetoCard** (cinematic):
- "Deadhand blocked this." header in danger color
- Violated rule (ruleType)
- Severity badge
- Human explanation
- Attempted action summary
- Trigger details (what value, what limit, what path)
- Safe alternative / required correction
- No approve or execute controls — this action is final

**REQUIRES_APPROVAL → ApprovalGate + SafetyCard**:
- "Review required." header in amber
- Safety card expanded: estimated spend, value at risk, contracts touched, tokens touched, approval scope, simulation result, risk summary
- Approve / Reject buttons
- If APPROVED: execute button appears with sign flow

**AUTO_APPROVED → AutoApprovedCard + SafetyCard**:
- "Within policy bounds." header in success color
- Safety card (compact)
- Execute button

Execute flow:
- Confirm modal shows action summary and safety card
- Two paths (determined by demo mode):
  - Normal: "Sign and execute" (in hackathon: simplified — submits with `signedPayload: "0xdemo"` or user signs via wagmi)
  - Demo wallet: submit with `useDemoWallet: true` (clearly labeled "Demo Wallet Path")
- After execution: tx hash + BscScan link
- Action status updates to `EXECUTED`
- Parent task status updates to `COMPLETED` once all actions are terminal, which is the correct trigger for replay/export links

### Replay Page (`/app/replay/:taskId`)

Purpose: make the decision trail cinematic and legible.

Layout: full-width timeline, vertical, top-to-bottom.

Each step in the ReplayStory renders as a `ReplayStep` component:
- Step type icon (GOAL, INTENT, ACTION_PLAN, DEADHAND_VETO, APPROVAL_GATE, SIMULATION, EXECUTION_GUARD, EXECUTION_RESULT, EMERGENCY_STOP)
- Title
- Summary text
- Reason codes (displayed as chips)
- Payload preview (collapsible)

Step reveal: sequential animated entry. Each step slides in from the left with a small delay, as if the timeline is being reconstructed in real time.

Special treatments:
- DEADHAND_VETO step: danger color, slightly larger, subtle red glow
- EXECUTION_RESULT step: success or failure color + explorer link if tx exists
- EMERGENCY_STOP step: amber/warning, full-width highlight

Export panel (sticky at top):
- "Export JSON" button → downloads story as JSON
- "Export Markdown" button → downloads story as Markdown
- "Copy Markdown" button

### Audit Page (`/app/audit`)

Filterable audit event list.
Filters: eventType, storyClass, severity, reasonCode
Each row: timestamp, event type, story class badge, severity badge, task link if applicable.
Click row to expand metadata JSON (collapsible).

### Demo Page (`/app/demo`)

Guided walkthrough mode for judges.

Structure:
- Header: "Adversarial Demo: Deadhand in action"
- Step indicator (1 of 6, 2 of 6, etc.)
- Guided narrative text per step
- Backend calls happen live (using seeded demo data via `/seed:demo` or the gauntlet scenarios)
- Each step reveals the corresponding UI moment

Steps:
1. Policy setup — select "Launch Guard: Safe Launch" preset
2. Submit a goal ("Help me set up launch liquidity using 2 BNB total")
3. Veto moment — show the BLOCKED action dramatically
4. Safety Card — show the REQUIRES_APPROVAL action with blast radius
5. Approval + execution — approve the bounded action, run execution guard, see result
6. Replay — load the full audit story replay
7. (Optional) Emergency stop — trigger kill switch, show system halt

Between steps: brief copy explaining what just happened and why it matters.

### Emergency Kill Switch (persistent, all app pages)

The kill switch is not a page. It is:

1. A persistent button in the top bar (always visible when authenticated)
2. An emergency banner (amber, full-width) when stopped state is active
3. A confirm modal before activation

Kill switch button states:
- Normal: subtle amber outline button, labeled "Emergency Stop"
- Hover: color intensifies slightly
- Click: confirm modal opens ("This will halt all operations and cancel pending actions. This cannot be undone without manual resume.")
- Active (stopped): button changes to "Resume Operations", banner activates

Emergency banner (when stopped):
- Full-width, amber background
- "Deadhand halted. All operations suspended." + timestamp
- "Resume" button

---

## 7. Key Component Specifications

### VetoCard (trust/VetoCard.tsx)

The most important component. Must be unforgettable.

Entry animation:
- Card scale from 0.96 → 1.0
- Red border animates in (stroke draw or opacity)
- Content stagger: header first, then trigger details, then correction
- Subtle danger-color glow behind card

Required data: `decisionReceipt` from backend

Visual:
- Dark card with danger-color top border (2px)
- Top-left: red circle icon + "BLOCKED"
- Rule type label (e.g., "MAX_TRANSACTION_BNB")
- Severity badge (CRITICAL / HIGH / WARNING)
- Human explanation (large, readable)
- Attempted action summary (compact technical block)
- Trigger table: field, expected, actual, path
- Safe alternative (if present): amber callout
- Required correction (if present): amber callout
- Footer: "This action was permanently blocked by Deadhand. No override is possible."

### SafetyCard (trust/SafetyCard.tsx)

Expand animation:
- Height from 0 to full
- Content staggered in

Visual:
- Amber top border when approvalRequired = true
- Green top border when auto-approved
- Rows: Estimated Spend, Value at Risk, Contracts Touched, Tokens Touched
- Simulation result (PASSED / FAILED / PENDING)
- Approval scope text
- Risk summary
- Reason code chips at bottom

### CompilerReceipt (trust/CompilerReceipt.tsx)

Visual reveal:
- "Compiling policy intent..." spinner state
- Sequential line-by-line reveal of compiled rules (like a terminal output, but premium)
- Final validation badge animates in

Visual:
- Dark panel with amber accent
- Header: "Policy Compiler Receipt"
- Original intent (quoted in amber)
- Validation result badge
- Compiled rules list (each: ruleType, decision badge, explanation)
- Enforceable artifact block (artifactType, version, ruleCount)
- Footer: "AI interpreted your intent. Deadhand will enforce these rules exactly."

### ReplayTimeline (replay/ReplayTimeline.tsx)

Visual:
- Vertical timeline with connecting line (amber/steel)
- Each step is a card connected to the line
- GOAL step: simple, clean
- DEADHAND_VETO: danger color, larger
- EXECUTION_RESULT: explorer link embedded

Animation: steps reveal sequentially, left-aligned, sliding in from slightly below, 80ms stagger between steps.

### EmergencyBanner (emergency/EmergencyBanner.tsx)

Visual:
- Full-width, amber background
- Alert icon
- "Deadhand halted. All operations suspended." + timestamp
- Resume button (right-aligned)

Animation:
- Slides down from top (height 0 → 52px, 300ms spring)
- On resume: slides back up

### TopologyField (graphics/TopologyField.tsx)

Canvas or SVG-based animated background used on landing hero and select app surfaces.

Approach:
- Draw a sparse network of nodes and edges
- Nodes pulse slowly
- Edges draw and fade
- Nodes in amber/steel palette
- Very low opacity (0.15–0.25) so it never overwhelms text
- Responsive to container size

Can be implemented with a simple canvas `requestAnimationFrame` loop or using `react-canvas-confetti`-style approach.

---

## 8. Motion Strategy (Detailed)

### Standard motion (all interactive elements)

```typescript
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
}

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 400, damping: 40 }
}

export const cardReveal = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 320, damping: 35 }
}

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 }
  }
}
```

### Cinematic moments

**Veto card reveal:**
```typescript
export const vetoReveal = {
  initial: { opacity: 0, scale: 0.95, y: 16 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 28, mass: 1.1 }
  }
}

// Border glow pulse after reveal:
export const vetoPulse = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(192, 57, 43, 0)",
      "0 0 24px rgba(192, 57, 43, 0.3)",
      "0 0 8px rgba(192, 57, 43, 0.15)"
    ],
    transition: { duration: 0.8, times: [0, 0.4, 1], ease: "easeOut" }
  }
}
```

**Kill switch activation:**
```typescript
// Flash overlay (full-screen amber flash)
export const killSwitchFlash = {
  initial: { opacity: 0 },
  animate: { opacity: [0, 0.3, 0] },
  transition: { duration: 0.4, times: [0, 0.2, 1] }
}

// Banner entry:
export const bannerDrop = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 52, opacity: 1 },
  transition: { type: "spring", stiffness: 400, damping: 40 }
}
```

**Compiler receipt line reveal:**
```typescript
export const lineReveal = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.15 }
}
// Each line staggered 40ms
```

**Replay timeline step:**
```typescript
export const replayStep = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  transition: { type: "spring", stiffness: 300, damping: 35 }
}
// Steps stagger 80ms each
```

**Route transitions:**
```typescript
export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.22, ease: "easeOut" }
}
```

**Safety card expand:**
```typescript
// Use Framer Motion's `AnimatePresence` + height animation
// Content staggered after height animation completes
```

**Drift lock alert:**
```typescript
export const driftShake = {
  animate: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5 }
  }
}
```

---

## 9. Copy Strategy

### Principles

1. **Confident + direct** at brand/headline level
2. **Precise + technical** at detail/label level
3. **Elevated** at critical moment level (Veto, Kill Switch, Replay)
4. **Never robotic** — human enough to feel intelligent, not bureaucratic
5. **Never dramatic-for-drama** — every strong word earns its place

### Voice Examples

| Context | Copy |
|---------|------|
| Hero headline | "AI should plan. Not decide." |
| Sub-headline | "Deadhand is the trust boundary between AI intent and wallet execution." |
| Trust model | "AI interprets. Deadhand decides. You sign." |
| Veto header | "Deadhand blocked this." |
| Veto footer | "This action was permanently blocked. No override is possible." |
| Approval header | "Review required." |
| Approval explainer | "This action exceeds your approval threshold. Review the blast radius below before proceeding." |
| Auto-approved header | "Within policy bounds." |
| Safety card label | "Blast Radius Preview" |
| Compiler receipt header | "Policy Compiler Receipt" |
| Compiler sub-label | "Your intent, translated into enforcement." |
| Compiler footer | "AI interpreted your intent. Deadhand will enforce these rules exactly." |
| Emergency stop button | "Emergency Stop" |
| Emergency banner | "Deadhand halted. All operations suspended." |
| Emergency resume button | "Resume Operations" |
| Drift lock | "Execution envelope changed. Action blocked." |
| Replay header | "Audit Story" |
| Replay sub-label | "Every decision, reconstructed." |
| Export button | "Export Proof" |
| Guard passed | "Execution guard passed." |
| Guard failed | "Execution guard failed. Action blocked." |
| Dashboard policy label | "Active Policy" |
| Empty state (no tasks) | "No operations yet. Submit a goal to begin." |
| Empty state (no policies) | "No policies configured. Create a policy to enable operations." |
| Demo page header | "Deadhand in Action" |
| Demo page sub | "A live adversarial walkthrough. Watch the policy engine defend your wallet." |

### Capitalization Conventions

- Product name: always "Deadhand"
- Feature names: "Deadhand Veto", "Safety Card", "Policy Compiler", "Drift Lock", "Emergency Kill Switch", "Replay Story", "Launch Guard Pack"
- Action types in UI: title case ("Buy Token", "Four.Meme Buy")
- Reason codes: display in smaller monospace, not as headline copy
- Severity levels: ALL CAPS (CRITICAL, HIGH, WARNING, INFO)
- Policy decisions: ALL CAPS (BLOCKED, REQUIRES APPROVAL, AUTO APPROVED)
- Backend status enums: not shown raw to user — always translated to human copy

---

## 10. Backend Contract Integration

### API Client

Base URL:
- use the Vite dev proxy by default: `/api` → `http://localhost:3001`
- optional direct override: `VITE_API_BASE_URL`
- optional proxy target override: `VITE_BACKEND_PROXY_TARGET`

All authenticated requests include `Authorization: Bearer <jwt>` header.

JWT is stored in Zustand `authStore` and persisted in localStorage so refresh does not immediately discard the session.

### Auth Flow

1. User clicks "Connect Wallet" → direct `window.ethereum` flow requests accounts
2. On connect: call `POST /auth/challenge { walletAddress }`
3. Backend returns: `{ nonce, message, createdAt, expiresAt, ttlSeconds }`
4. Use `personal_sign` with the returned `message`
5. Call `POST /auth/verify { walletAddress, signature }`
6. Store returned JWT and user identity in authStore
7. Redirect to `/app`

### Polling

Task status polling:
- When task status is PENDING or NEEDS_CLARIFICATION → poll `GET /tasks/:id` every 2000ms
- Stop polling when status is ACTIVE, COMPLETED, CANCELLED, or FAILED

Action status polling:
- When action is EXECUTING → poll task every 1500ms

Emergency state polling:
- Minimal: poll `/demo-wallet/status` or check embedded in dashboard query. Alternatively, store kill switch state client-side and sync with each task create/execute call.

### Error Handling

All API errors surface to the user via toast notifications.
Trust-critical errors (drift lock, execution failed, policy evaluation error) also display inline in the relevant component.
Never silently swallow backend errors.

### State Mapping

See `docs/backend-handoff.md` section "Recommended frontend state mapping" for full task/action/policy decision state → UI state mapping.

Key translations:
```
task.status === "PENDING"              → "Planning..."
task.status === "NEEDS_CLARIFICATION"  → "Clarification needed"
task.status === "ACTIVE"               → "Review required" / "Ready"
task.status === "COMPLETED"            → "Completed"
task.status === "CANCELLED"            → "Cancelled"
task.status === "FAILED"               → "Failed"

action.policyDecision === "BLOCKED"             → VetoCard
action.policyDecision === "REQUIRES_APPROVAL"   → ApprovalGate + SafetyCard
action.policyDecision === "AUTO_APPROVED"        → AutoApprovedCard + SafetyCard

severity === "CRITICAL" → danger color
severity === "HIGH"     → danger-dim color
severity === "WARNING"  → amber color
severity === "INFO"     → steel-blue color
```

---

## 11. Implementation Phases

These phases represent execution order during a single continuous build. They are not separate approval gates — build through them in sequence.

### Phase 0: Project scaffold + design system

Tasks:
- Create `apps/frontend/` with `package.json`, `vite.config.ts`, `tailwind.config.ts`
- Set up Tailwind with design tokens (colors, fonts, spacing)
- Configure Google Fonts (Syne, Inter, JetBrains Mono)
- Create base Tailwind config with custom color palette
- Create `src/lib/`, `src/store/`, `src/api/` foundations
- Create base UI components (Button, Card, Badge, Input, Spinner)
- Create Zustand stores (authStore, emergencyStore, uiStore)
- Create API client (axios with JWT interceptor)
- Configure wagmi with MetaMask + injected connector
- Configure TanStack Query
- Set up React Router with route structure

Acceptance: `npm run dev` starts, design tokens visible in Tailwind, routing works.

### Phase 1: Landing page

Tasks:
- Build `pages/Landing.tsx` with all sections
- Build `components/landing/Hero.tsx` with topology background
- Build `components/graphics/TopologyField.tsx` (canvas animation)
- Build `components/landing/TrustModel.tsx` (animated 3-node flow)
- Build `components/landing/HowItWorks.tsx` (6-step staggered)
- Build `components/landing/FeatureShowcase.tsx` (6 cards)
- Build `components/landing/DemoProof.tsx`
- Build `components/landing/Footer.tsx`
- Build `components/wallet/WalletConnect.tsx`
- Wire auth flow (challenge → sign → verify → JWT store → redirect)

Acceptance: Landing page renders, connect wallet works, auth succeeds, redirects to `/app`.

### Phase 2: App shell + dashboard

Tasks:
- Build `components/layout/AppShell.tsx` (sidebar + topbar + content area)
- Build `components/layout/Sidebar.tsx` (nav links with active states)
- Build `components/layout/TopBar.tsx` (wallet status + kill switch button + logo)
- Build `components/emergency/EmergencyBanner.tsx`
- Build `components/emergency/KillSwitch.tsx` (button + confirm modal)
- Build `pages/app/Dashboard.tsx` (system status, active policy, recent tasks)
- Wire emergency stop/resume endpoints

Acceptance: App shell renders, navigation works, emergency stop triggers and banner appears.

### Phase 3: Policy surfaces

Tasks:
- Build `pages/app/PoliciesPage.tsx` (list)
- Build `components/policy/PolicyCard.tsx`
- Build `components/policy/PresetGrid.tsx`
- Build `pages/app/PolicyDetailPage.tsx` (view + edit)
- Build `components/policy/PolicyBuilder.tsx` (structured form)
- Build `components/policy/CompilerInput.tsx` (NL input + compile trigger)
- Build `components/trust/CompilerReceipt.tsx` (with animated reveal)
- Wire: list presets, compile, create, update, pause/resume, archive

Acceptance: Can create a policy from preset or structured form, compiler receipt renders with animation.

### Phase 4: Task flow + action list

Tasks:
- Build `pages/app/TasksPage.tsx` (list + new task form)
- Build `components/task/TaskSubmit.tsx`
- Build `components/task/TaskCard.tsx`
- Build `pages/app/TaskDetailPage.tsx`
- Build `components/task/ActionList.tsx` (staggered render)
- Build `components/task/ActionCard.tsx` (routes to correct sub-component)
- Build `components/task/ClarificationPrompt.tsx`
- Wire: create task, clarify, cancel, poll task status

Acceptance: Can submit a task, see clarification if needed, see action list with correct decision badges.

### Phase 5: Veto + Safety + Approval (trust moments)

Tasks:
- Build `components/trust/VetoCard.tsx` (cinematic, full spec)
- Build `components/trust/SafetyCard.tsx` (expand animation, full spec)
- Build `components/trust/ApprovalGate.tsx` (wraps SafetyCard + approve/reject)
- Build `components/trust/AutoApprovedCard.tsx`
- Build `components/trust/PolicyDecisionBadge.tsx`
- Build `components/trust/SeverityBadge.tsx`
- Build `components/trust/ReasonCodeChip.tsx`
- Build `components/task/ExecuteModal.tsx` (confirm + sign flow)
- Wire: approve, reject, execute (with demo wallet path labeled)

Acceptance: Veto card reveals cinematically, safety card expands, approve/execute flow works.

### Phase 6: Replay + Audit

Tasks:
- Build `pages/app/ReplayPage.tsx`
- Build `components/replay/ReplayTimeline.tsx` (sequential reveal)
- Build `components/replay/ReplayStep.tsx` (per step type treatment)
- Build `components/replay/ExportPanel.tsx` (JSON + Markdown download)
- Build `pages/app/AuditPage.tsx`
- Build `components/replay/AuditEventRow.tsx`
- Wire: `GET /tasks/:id/replay`, `GET /tasks/:id/export`, `GET /audit`

Acceptance: Replay loads and steps reveal sequentially, export downloads work.

### Phase 7: Demo / Gauntlet page

Tasks:
- Build `pages/app/DemoPage.tsx` (guided walkthrough)
- Step state machine (current step, progress, narrative text)
- Each step makes real API calls and shows corresponding UI
- Step transitions are smooth and narrative explains what happened
- Wire to real backend (requires backend to be running with seeded data or mock provider)

Acceptance: Walking through all 7 steps shows every key product moment in sequence.

### Phase 8: Drift lock alert + remaining trust surfaces

Tasks:
- Build `components/trust/DriftLockAlert.tsx`
- Build `components/wallet/DemoWalletBadge.tsx`
- Build `components/wallet/WalletStatus.tsx`
- Polish all surface edge cases (empty states, loading states, error states)
- Ensure every trust-critical backend field is surfaced

Acceptance: Drift lock scenario shows DriftLockAlert, demo wallet path is correctly labeled.

### Phase 9: Motion pass + copy pass + polish

Tasks:
- Add page transitions to all route changes (React Router + Framer Motion `AnimatePresence`)
- Audit all animations for consistency (spring configs, stagger timings)
- Add ambient pulse animations to status indicators
- Final copy review: all labels, headers, empty states, error messages
- Responsiveness check (desktop primary, but not broken at 1024px minimum)
- Final color audit (no generic colors slipping through)
- Remove any placeholder text

Acceptance: Full product feels premium, motion is consistent, copy is sharp.

### Phase 10: Testing + validation

Tasks:
- Run through full happy path (connect → create policy → submit task → veto → approval → execute → replay)
- Run through adversarial path (overspend veto, drift lock, kill switch)
- Test all empty states
- Test error states (network error, auth failure, policy evaluation error)
- Verify Veto card renders correctly for all demo backend shapes
- Verify Safety Card renders correctly for both REQUIRES_APPROVAL and AUTO_APPROVED
- Verify Compiler Receipt animates correctly
- Verify Replay Timeline steps all render
- Verify Emergency stop/resume cycle works
- Browser test in Chrome (primary demo browser)

---

## 12. Demo Flow (Winning Sequence)

The primary demo is a live walkthrough of the following sequence. This is the story that wins.

### Setup
Backend must be running. Either real Anthropic provider or mock AI (mock is fine for demo — the trust model logic is identical). Use demo seeded data or let the demo page create live.

### Step 1: Policy Setup
- Select "Launch Guard Pack: Safe Launch" preset
- Show compiler receipt if natural language path is used
- Policy saved → show policy card with enforced rules

### Step 2: Submit Goal
- Input: "Help me set up launch liquidity using 2 BNB total"
- Task enters PENDING state → brief loading state
- Task becomes ACTIVE with candidate actions

### Step 3: Deadhand Veto (Hero Moment)
- Show BLOCKED action (overspend attempt)
- VetoCard reveals cinematically
- "Deadhand blocked this. Proposed 2.0 BNB exceeds max transaction 0.5 BNB."
- Severity CRITICAL badge visible
- Safe alternative shown
- No override possible — this is the core product truth

### Step 4: Safety Card + Approval Gate
- Show REQUIRES_APPROVAL action
- Safety card expands showing blast radius
- Estimated spend, value at risk, contracts touched, simulation PASSED
- User clicks Approve
- Execute button appears

### Step 5: Execution Guard
- Execute triggered
- Execution guard runs (brief loading state)
- Guard passed → execution proceeds
- tx hash + BscScan link shown (or mock hash if unfunded)

### Step 6: Replay / Audit Story
- Navigate to Replay
- Timeline reconstructs the full story sequentially
- GOAL → INTENT → ACTION_PLAN → DEADHAND_VETO → APPROVAL_GATE → EXECUTION_GUARD → EXECUTION_RESULT
- Each step reveals with animation
- Export proof downloaded (Markdown)

### Step 7: Emergency Kill Switch (Optional Finale)
- Hit Emergency Stop
- Full-screen flash, amber banner drops
- "Deadhand halted. All operations suspended."
- Demonstrates global control

---

## 13. Testing Plan

### Functional

| Test | Method |
|------|--------|
| Auth flow (challenge/verify/logout) | Browser test with MetaMask or browser wallet |
| Policy create from preset | Browser test |
| Policy compile + receipt | Browser test |
| Task submit + action list | Browser test (mock AI provider) |
| Veto card renders for BLOCKED action | Browser test |
| Safety card renders for REQUIRES_APPROVAL | Browser test |
| Approval + execute flow | Browser test (demo wallet or mock) |
| Drift lock blocks execution | Browser test (requires DriftChainProvider scenario) |
| Replay timeline renders | Browser test |
| Export downloads | Browser test |
| Emergency stop/resume cycle | Browser test |
| Kill switch banner appears | Browser test |
| Kill switch clears on resume | Browser test |

### Visual / Motion

| Test | Check |
|------|-------|
| VetoCard entry animation | Smooth, no jank, glow fires once |
| SafetyCard expand | Height animates correctly, no layout shift |
| Compiler receipt line reveal | Sequential, correct timing |
| Replay timeline stagger | All steps render, correct order |
| Emergency flash | Fires on kill switch, single occurrence |
| Page transitions | Smooth, no flicker |
| Topology background | Renders, animates, low-opacity, no performance issues |

### Trust legibility

| Check | Pass criteria |
|-------|---------------|
| VetoCard clearly communicates BLOCKED | "No override possible" visible |
| SafetyCard shows all blast radius fields | Spend, risk, contracts, simulation all visible |
| Compiler receipt shows both intent and enforcement | Both sections clearly labeled |
| Demo wallet path is labeled as demo-only | "Demo Wallet" badge visible |
| Kill switch state is visually unmistakable | Banner visible on all app pages |
| AI authority is not overstated | No UI element implies AI decided safety |

---

## 14. Risks and Tradeoffs

| Risk | Mitigation |
|------|------------|
| Topology background hurts performance | Keep canvas off-screen, use requestAnimationFrame with frameSkip |
| Wagmi wallet connect fails in demo environment | Fallback to demo wallet path (clearly labeled) |
| Backend not running during demo | Demo page should degrade gracefully with clear error messages |
| Framer Motion bundle size | Tree-shake imports, lazy load animation-heavy pages |
| TanStack Query cache stale during fast demo | Low staleTime (5s) on task/action queries |
| Auth JWT expires mid-demo | Set JWT TTL high in demo environment (backend env var) |
| CORS during local dev | Backend now allows localhost frontend origins by default; still verify direct-call mode if `VITE_API_BASE_URL` is used |

---

## 15. Important Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Vite over Next.js | No SSR needed for wallet app, faster DX, simpler config |
| Syne + Inter + JetBrains Mono | Avoids AI-site look, premium + technical without terminal cosplay |
| Amber as primary accent | Signals authority/trust without defaulting to AI-blue cliché |
| Framer Motion over CSS transitions for cinematic moments | Spring physics gives organic feel, complex sequences are composable |
| JWT persisted in Zustand/localStorage | Better local integration and less fragile frontend testing across refreshes |
| TanStack Query polling over WebSockets | Simpler, no backend socket setup needed, sufficient for demo latency |
| Demo wallet path clearly labeled | Preserves non-custodial trust model, does not mislead judges |
| Guided demo page as separate route | Judges can follow the story without knowing the product already |
| No light mode | Dark only for demo strength, visual consistency, motion clarity |
| Landing page included | Better first impression for judges, narrative framing matters |

---

## 16. Status Tracker

Updated as phases complete.

| Phase | Status | Notes |
|-------|--------|-------|
| 0: Scaffold + design system | ✅ complete | Vite + React 18 + TS + Tailwind + FM11 |
| 1: Landing page | ✅ complete | Hero, TrustModel, HowItWorks, FeatureShowcase, Footer |
| 2: App shell + dashboard | ✅ complete | AppShell, TopBar, Sidebar, EmergencyBanner, KillSwitch |
| 3: Policy surfaces | ✅ complete | PoliciesPage, PolicyDetailPage, PresetGrid, CompilerInput |
| 4: Task flow + action list | ✅ complete | TasksPage, TaskDetailPage, TaskSubmit, ActionList |
| 5: Veto + Safety + Approval | ✅ complete | VetoCard (double-bezel), SafetyCard, ApprovalGate, AutoApprovedCard |
| 6: Replay + Audit | ✅ complete | ReplayPage, ReplayTimeline, ReplayStep, AuditPage |
| 7: Demo page | ✅ complete | 6-step guided demo flow |
| 8: Drift lock + remaining | ✅ complete | DriftLockAlert, WalletStatus, DemoWalletBadge |
| 9: Motion + copy + polish | ✅ complete | Uplift pass: fonts, motion timing, eyebrow, noise, bezel |
| 10: Build verification | ✅ typecheck clean + vite build passes | 535KB bundle, 7.95s |

---

## 17. Resume Instructions (For Another Agent)

If picking up from a partial state:

1. Read this document fully
2. Read `docs/backend-handoff.md` for route contracts
3. Read `packages/types/src/index.ts` for shared type definitions
4. Check the Status Tracker (Section 16) to find last completed phase
5. Check `context.md` for any updates made after this doc was written
6. The backend runs at port 3001 by default. Ensure `apps/backend` is started before testing
7. The frontend is in `apps/frontend/` as a Vite + React app
8. Design system tokens are in `tailwind.config.ts` — do not change color/font values without updating this doc
9. Motion variants are in `src/lib/motion.ts` — use these consistently
10. Never invent backend safety logic in the frontend
11. Never imply AI is the authority — always surface "Deadhand blocked/approved/required"
12. The trust model (AI interprets / Deadhand decides / User signs) must remain visible in the product

---

## Section 25 — Uplift Pass: Design Skill Analysis & Revised Strategy (2026-04-22)

### Skills Reviewed

| Skill | Location | Status |
|-------|----------|--------|
| `emilkowalski/skill` | `~/.agents/skills/emil-design-eng` | **Used** |
| `raphaelsalaja/userinterface-wiki` | `~/.agents/skills/userinterface-wiki` | **Used** |
| `shadcn/ui` | `~/.agents/skills/shadcn` | **Not used** — no shadcn project setup, custom system retained |
| `taste-skill` (Leonxlnx) | `~/.agents/skills/design-taste-frontend` | **Used** |
| `pbakaus/impeccable` | `~/.agents/skills/impeccable` | **Used** |
| `gsap-skills` | `~/.agents/skills/gsap-react` + others | **Not used** — framer-motion already installed; useScroll/useTransform covers all needs |
| `framer-motion` (npm) | Already installed | **Used heavily** — useScroll, useTransform, useMotionValue added |

### Critical Finding: Font Stack Must Change

`impeccable` skill's font selection procedure explicitly bans both current fonts:
- **Syne** → on `reflex_fonts_to_reject` list
- **Plus Jakarta Sans** → on `reflex_fonts_to_reject` list

Both are high-frequency training-data defaults creating cross-project monoculture.

**Brand voice analysis**: "authoritative · forensic · decisive" — mission control, high-stakes protocol, forensic precision. NOT editorial, NOT startup.

**New font stack**:
```
Display:  Barlow Semi Condensed 600/700/800 — tight, industrial, militarily authoritative
          NOT on banned list. Matches the "Deadhand blocked this." veto moment perfectly.

UI/Body:  Epilogue 400/500/600 — clean geometric sans, slightly angular
          NOT on banned list. High legibility at data-dense UI sizes.

Mono:     JetBrains Mono 400/500 — retained (not on banned list)
```

### Motion System Corrections (emilkowalski + userinterface-wiki)

Current violations to fix:
- Stagger delay: 60ms per item → too slow for lists. Target < 50ms (max 40ms for short lists)
- Some components use `ease-in-out` where exits need `ease-in`, entrances need `ease-out`
- Missing `:active` / press states on interactive elements
- Some `transition-all` patterns — must target specific properties
- Exit animations in AnimatePresence need proper direction (y: -4 up, not y: 8 down)

### Physical Interaction States (taste-skill)

All interactive elements need:
- Button `:active` → `scale(0.97)` or `translateY(1px)`
- Primary CTA → magnetic hover via `useMotionValue` + `useTransform` (NOT useState)
- Card hover → subtle border brightness + 1px lift shadow
- High-frequency interactions (nav links) → NO animation, instant

### Layout Fixes (taste-skill)

- Hero section: `h-screen` → `min-h-[100dvh]` for iOS Safari safety
- Noise texture overlay: must be on `position: fixed; pointer-events: none` pseudo-element
- Double-bezel card treatment on VetoCard and FeatureShowcase cards

### Scroll-Based Landing (framer-motion useScroll)

- TrustModel section: scroll progress drives node reveal sequence
- FeatureShowcase: staggered whileInView reveals with corrected timing
- Hero: subtle parallax on TopologyField via useScroll/useTransform

### Files Changed in Uplift Pass

| File | Change |
|------|--------|
| `index.html` | New font imports: Barlow Semi Condensed + Epilogue |
| `tailwind.config.ts` | Font family tokens updated |
| `src/styles/globals.css` | Typography defaults, noise texture, improved utilities |
| `src/lib/motion.ts` | Fixed timing, corrected spring configs, new scroll variants |
| `src/components/ui/Button.tsx` | Physical press states, magnetic primary, hover fix |
| `src/components/landing/Hero.tsx` | min-h-[100dvh], asymmetric layout, scroll parallax, copy |
| `src/components/landing/TrustModel.tsx` | useScroll-driven reveal, better framing copy |
| `src/components/landing/FeatureShowcase.tsx` | Double-bezel cards, corrected stagger |
| `src/components/landing/HowItWorks.tsx` | Layout fix, copy tightening |
| `src/components/landing/Footer.tsx` | Better CTA copy |
| `src/components/trust/VetoCard.tsx` | Double-bezel, cinematic reveal tuning, copy precision |
| `src/components/trust/CompilerReceipt.tsx` | Sequential reveal polish |
| `src/components/trust/SafetyCard.tsx` | Layout improvement |
| `src/components/layout/TopBar.tsx` | Refined logo + nav treatment |
| `src/components/layout/Sidebar.tsx` | Active state precision |

---

## Section 26 — Final Polish Pass (2026-04-22)

### Documentation Corrections
- Deleted incorrect duplicate docs created in apps/frontend/docs/ (context.md, frontend-continuity.md)
- Canonical docs are /deadhand/context.md, /deadhand/docs/frontend-continuity.md, /deadhand/docs/frontend-master-handoff.md
- Added docs/demo-script.md (video demo pre-execution checklist + 4:30-5:00 narration script)
- Updated README.md with full strategic overview, trust model, architecture diagram, setup instructions

### Frontend Fixes Applied
- `Landing.tsx`: bg-background → bg-bg, min-h-screen → min-h-[100dvh]
- `Dashboard.tsx`: removed redundant inline stopped banner (EmergencyBanner in AppShell covers all pages)
- `AppShell.tsx`: h-screen → h-[100dvh] (iOS Safari safety)
- `motion.ts`: vetoContent stagger 60ms → 40ms; landingHeroReveal stagger 120ms → 80ms
- `globals.css`: added veto glow pulse keyframe animation; KillSwitch transition-all → specific properties
- `KillSwitch.tsx`: transition-all → specific transition properties
- Favicon redesigned: dual-hex precision mark (outer hex + inner rotated hex 30° + center node)
- TopBar inline logo SVG updated to match new dual-hex mark

### Emergency Stop Verification — CLEAN
- KillSwitch: renders when not stopped; returns null when stopped (correct)
- EmergencyBanner: renders above TopBar in AppShell with spring bannerDrop animation (correct)
- HALTED badge in TopBar: renders when stopped (correct)
- Resume path: EmergencyBanner → handleResume() → setStopped(false) → banner slides up → KillSwitch reappears (correct)
- No duplicate emergency UI found
- Emergency state now hydrates from backend truth through `GET /emergency-status`, so page refresh preserves halted UI state correctly.
- Emergency confirmation dialog now portals to `document.body` with viewport-safe centering and scroll-lock, which prevents the dialog from rendering too high or being clipped inside the TopBar/app-shell stacking context.

### Final Build Verification
- `npm run typecheck`: CLEAN
- `npm run build`: PASSES — 535KB / 7.95s
- Routes: all confirmed wired in App.tsx
- Protected routes: AppShell redirects to / when isAuthenticated=false
- Favicon: public/favicon.svg updated with stronger mark
