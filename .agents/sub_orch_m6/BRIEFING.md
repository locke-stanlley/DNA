# BRIEFING — 2026-07-15T05:36:00Z

## Mission
Implement and verify Milestone 6 (Requirement R6: Contract Upgradability). Upgraded contracts must successfully run the new logic and read from their old storage.

## 🔒 My Identity
- Archetype: sub_orch
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /workspaces/DNA/.agents/sub_orch_m6
- Original parent: parent
- Original parent conversation ID: 86127401-42af-4750-bb28-0f35461eb58e

## 🔒 My Workflow
- **Pattern**: Project / Canonical / Infinite
- **Scope document**: /workspaces/DNA/.agents/sub_orch_m6/SCOPE.md
1. **Decompose**: Decompose the implementation and verification tasks into sub-milestones.
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: Spawn workers, reviewers, challengers, and auditors to implement and verify.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Core payload changes [pending]
  2. Ledger tx handler changes [pending]
  3. NeoVM ContractUpgrade implementation [pending]
  4. WasmVM ContractUpgrade implementation [pending]
  5. CLI upgrade subcommand [pending]
  6. E2E and integrity verification [pending]
- **Current phase**: 1
- **Current focus**: Decompose and plan

## 🔒 Key Constraints
- Provide a system contract function or CLI option to upgrade the code of deployed smart contracts under the same address, keeping the original contract storage intact.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 86127401-42af-4750-bb28-0f35461eb58e
- Updated: not yet

## Key Decisions Made
- [TBD]

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 0 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 19e33086-505b-4ac5-aae0-11f3d8303d8f/task-120
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- /workspaces/DNA/.agents/sub_orch_m6/ORIGINAL_REQUEST.md — Original user request
- /workspaces/DNA/.agents/sub_orch_m6/progress.md — Progress heartbeat and status checkpoint
