# BRIEFING — 2026-07-15T05:30:04Z

## Mission
Orchestrate implementation and verification of advanced blockchain features on the DNA network.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /workspaces/DNA/.agents/orchestrator
- Original parent: parent
- Original parent conversation ID: 3aac8b47-4154-46e1-8022-773f38cd15f0

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: /workspaces/DNA/PROJECT.md
1. **Decompose**: Decompose the 7 requirements into individual milestones, design interface contracts and code layout, and delegate implementation to subagents.
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: For large milestones, spawn sub-orchestrators or workers.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. R1: ONT Governance Token [pending]
  2. R2: Centralized Bootstrap & DNS Seeders [pending]
  3. R3: Dynamic Validator Staking CLI [pending]
  4. R4: Block Rewards & Inflation [pending]
  5. R5: Fast Sync & State Pruning [pending]
  6. R6: Contract Upgradability [pending]
  7. R7: Optimized Wasm Compiler [pending]
  8. E2E Testing and Verification [pending]
- **Current phase**: 1
- **Current focus**: Milestone decomposition and planning.

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/ folder.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 3aac8b47-4154-46e1-8022-773f38cd15f0
- Updated: not yet

## Key Decisions Made
- Selected Project Pattern for orchestrating the multi-feature blockchain development.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| sub_orch_e2e | self | E2E Testing Orchestrator | in-progress | 48671da0-439b-4cbe-ad9d-6f3382132e11 |
| sub_orch_m1 | self | R1: ONT Governance Token | in-progress | 9f9707d4-5c24-4692-a833-d073631dcab7 |
| sub_orch_m2 | self | R2: Bootstrap/DNS | in-progress | 1057bd11-c719-433e-bbd4-2e7ef16caf03 |
| sub_orch_m5 | self | R5: Fast Sync/Pruning | in-progress | 3c1e2e83-d0e6-410c-bf0d-c4abea8f5dab |
| sub_orch_m6 | self | R6: Contract Upgradability | in-progress | 19e33086-505b-4ac5-aae0-11f3d8303d8f |
| sub_orch_m7 | self | R7: Optimized Wasm Compiler | in-progress | 2894430b-4330-4145-bf97-10cf802ef594 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: 48671da0-439b-4cbe-ad9d-6f3382132e11, 9f9707d4-5c24-4692-a833-d073631dcab7, 1057bd11-c719-433e-bbd4-2e7ef16caf03, 3c1e2e83-d0e6-410c-bf0d-c4abea8f5dab, 19e33086-505b-4ac5-aae0-11f3d8303d8f, 2894430b-4330-4145-bf97-10cf802ef594
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-15
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- /workspaces/DNA/.agents/orchestrator/ORIGINAL_REQUEST.md — Verbatim user request record
- /workspaces/DNA/.agents/orchestrator/BRIEFING.md — Persistent memory index
- /workspaces/DNA/.agents/orchestrator/progress.md — Liveness and task progress checklist
