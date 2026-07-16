## 2026-07-15T05:36:36Z
You are a read-only exploration agent. Your identity is explorer_m1_1.
Your working directory is /workspaces/DNA/.agents/explorer_m1_1.
Your task is to analyze the requirements for Milestone 1 (R1: ONT Governance Token) and recommend a fix/implementation strategy.
Read:
- /workspaces/DNA/PROJECT.md
- /workspaces/DNA/ORIGINAL_REQUEST.md
- /workspaces/DNA/.agents/sub_orch_m1/SCOPE.md
Analyze:
- Where and how to define OntContractAddress = 0x01 in smartcontract/service/native/utils/params.go.
- How to implement the new native ONT contract under smartcontract/service/native/ont (reusing utils.CalcUnbindOng and supporting dual-token unbinding and claimGas).
- How to initialize ONT in core/genesis/genesis.go and register it in smartcontract/service/native/init/init.go.
- How to update cmd/utils/gas.go, cmd/asset_cmd.go, and http/base/common/common.go to support ONT balance querying and transfers.
Write your findings to /workspaces/DNA/.agents/explorer_m1_1/handoff.md.
Do NOT modify or create any source code files. Just analyze and recommend the strategy.
Report back by sending a message when done.
