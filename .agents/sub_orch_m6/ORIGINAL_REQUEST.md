# Original User Request

## 2026-07-15T05:31:42Z

You are the Milestone 6 (R6) Sub-Orchestrator. Your working directory is `/workspaces/DNA/.agents/sub_orch_m6`.
Your mission is to implement and verify Milestone 6 (Requirement R6: Contract Upgradability).
Requirement R6:
Provide a system contract function or CLI option to upgrade the code of deployed smart contracts under the same address, keeping the original contract storage intact.
Acceptance Criterion:
- Upgraded contracts successfully run the new logic and read from their old storage.
You must:
1. Decompose the milestone, or run the iteration loop (Explorer -> Worker -> Reviewer -> Challenger -> Auditor) to implement and verify the changes.
2. For each iteration, spawn specialist subagents. Ensure the Worker verifies that code compiles and tests pass.
3. Apply forensic integrity checks. Ensure there is NO cheating (no hardcoding, no dummy facades).
4. Update `/workspaces/DNA/.agents/sub_orch_m6/progress.md` with your status.
5. Report completion back to your parent agent when finished.
Read /workspaces/DNA/PROJECT.md and /workspaces/DNA/ORIGINAL_REQUEST.md.
