# Original User Request

## Initial Request — 2026-07-15T05:27:24Z

Implement a set of advanced blockchain features on top of the DNA blockchain network, including the ONT governance token, dynamic seed discovery, DNS seeders, validator staking CLI, inflation, fast sync, contract upgradability, and an optimized Wasm compiler.

Working directory: /workspaces/DNA
Integrity mode: benchmark

## Requirements

### R1. ONT Governance Token
Introduce a second native token in the genesis block named "ONT Token" (symbol ONT, 0 decimals) with a total supply of 1,000,000,000. Staking and unbound generation rules must follow the dual-token model where holding ONT allows users to claim/unbind GAS over time.

### R2. Centralized Bootstrap & DNS Seeders
Implement peer discovery using a centralized HTTP bootstrap/registry server where active nodes register their endpoints. Add support for querying DNS seeders to bootstrap initial peer connections.

### R3. Dynamic Validator Staking CLI
Add CLI commands (e.g., `./dnaNode asset stake/unstake` or `./dnaNode consensus register`) allowing users to lock up tokens dynamically to register as consensus bookkeepers/validators.

### R4. Block Rewards & Inflation
Implement a block rewards mechanism that mints and distributes transaction fees or newly minted GAS tokens to participating consensus bookkeepers at each block.

### R5. Fast Sync & State Pruning
Implement headers-first fast synchronization to speed up initial network sync, and database state pruning to clean up redundant historical state.

### R6. Contract Upgradability
Provide a system contract function or CLI option to upgrade the code of deployed smart contracts under the same address, keeping the original contract storage intact.

### R7. Optimized Wasm Compiler
Replace the Wagon WASM interpreter with an optimized execution engine (such as wazero or wasmer-go) to improve contract performance.

## Verification & Acceptance Criteria

### Verification Mechanism
Provide a test script (`/workspaces/DNA/test_features.sh`) that automates tests for:
1. Querying ONT genesis balances and verifying the dual-token unbound GAS model.
2. Registering and querying dynamic staking via the new CLI commands.
3. Simulating centralized seed registry lookups.
4. Upgrading a test contract and verifying that storage is preserved while bytecode is updated.
5. Executing WASM smart contracts using the optimized compiler.

### Acceptance Criteria
- [ ] `./dnaNode asset balance` can query the 1,000,000,000 ONT token supply.
- [ ] Staking CLI commands complete successfully and modify validator stakes dynamically.
- [ ] central bootstrap seed node client correctly queries peer addresses from the mock HTTP service.
- [ ] upgraded contracts successfully run the new logic and read from their old storage.
- [ ] WASM tests run successfully and pass verification.
