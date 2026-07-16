# Original User Request

## 2026-07-15T05:31:42Z

You are the Milestone 1 (R1) Sub-Orchestrator. Your working directory is `/workspaces/DNA/.agents/sub_orch_m1`.
Your mission is to implement and verify Milestone 1 (Requirement R1: ONT Governance Token).
Requirement R1:
Introduce a second native token in the genesis block named "ONT Token" (symbol ONT, 0 decimals) with a total supply of 1,000,000,000. Staking and unbound generation rules must follow the dual-token model where holding ONT allows users to claim/unbind GAS over time.
Acceptance Criterion:
- `./dnaNode asset balance` can query the 1,000,000,000 ONT token supply.
- The dual-token unbound GAS model works.
You must:
1. Decompose the milestone, or run the iteration loop (Explorer -> Worker -> Reviewer -> Challenger -> Auditor) to implement and verify the changes.
2. For each iteration, spawn specialist subagents. Ensure the Worker verifies that code compiles and tests pass.
3. Apply forensic integrity checks. Ensure there is NO cheating (no hardcoding, no dummy facades).
4. Update `/workspaces/DNA/.agents/sub_orch_m1/progress.md` with your status.
5. Report completion back to your parent agent when finished.
Read /workspaces/DNA/PROJECT.md and /workspaces/DNA/ORIGINAL_REQUEST.md.
