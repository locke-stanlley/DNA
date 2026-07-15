# Project: DNA Advanced Blockchain Features

## Architecture
- Dual-token model (ONT and GAS) in core ledger/genesis.
- P2P discovery enhancement in `p2pserver` with HTTP bootstrap and DNS seeders.
- Staking CLI commands in `cmd` and validator state changes in `consensus` or `core`.
- Block rewards distribution in `consensus` / block generation.
- Sync logic in `p2pserver` / `core/ledger` and state pruning in db store.
- Smart contract service in `smartcontract/service` supporting contract upgradability.
- Wasm execution engine in `smartcontract/service/wasmvm` or `vm` using an optimized compiler.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1: ONT Governance Token | Native ONT token, dual-token model, unbound GAS generation | none | IN_PROGRESS (Conv: 9f9707d4-5c24-4692-a833-d073631dcab7) |
| 2 | R2: Centralized Bootstrap & DNS Seeders | Peer discovery via HTTP server registration and DNS seeders | none | IN_PROGRESS (Conv: 1057bd11-c719-433e-bbd4-2e7ef16caf03) |
| 3 | R3: Dynamic Validator Staking CLI | CLI for staking/unstaking, validator registration | M1 | PLANNED |
| 4 | R4: Block Rewards & Inflation | Block rewards distribution, inflation model for validators | M3 | PLANNED |
| 5 | R5: Fast Sync & State Pruning | Headers-first sync and DB state pruning | none | IN_PROGRESS (Conv: 3c1e2e83-d0e6-410c-bf0d-c4abea8f5dab) |
| 6 | R6: Contract Upgradability | Contract upgrade CLI/API, state preservation | none | IN_PROGRESS (Conv: 19e33086-505b-4ac5-aae0-11f3d8303d8f) |
| 7 | R7: Optimized Wasm Compiler | Wazero/Wasmer-go compiler integration replacing Wagon | none | IN_PROGRESS (Conv: 2894430b-4330-4145-bf97-10cf802ef594) |
| 8 | E2E Integration & Verification | test_features.sh verification, final E2E testing | M1-M7 | IN_PROGRESS (Conv: 48671da0-439b-4cbe-ad9d-6f3382132e11) |

## Interface Contracts
### CLI Commands
- `./dnaNode asset balance` to query ONT.
- `./dnaNode asset stake/unstake` or `./dnaNode consensus register` for dynamic validator staking.
- `./dnaNode contract deploy/upgrade` for smart contract deployment and upgradability.

### Wasm VM
- Integration of optimized Wasm compiler replacing Wagon interpreter under `smartcontract/service/wasmvm`.

## Code Layout
- `cmd/`: CLI commands implementation.
- `core/genesis/`: Genesis block setup and native asset deployment.
- `p2pserver/`: Node P2P network discovery, HTTP bootstrap, and fast sync.
- `consensus/`: Consensus engines, block generation, rewards distribution.
- `smartcontract/`: Deployed contract management, storage preservation, upgradability API.
- `vm/`: Optimized Wasm virtual machine integration.
