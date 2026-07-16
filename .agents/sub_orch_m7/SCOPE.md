# Scope: Milestone 7: Optimized Wasm Compiler

## Architecture
- Integration of optimized Wasm compiler (Wazero) replacing Wagon interpreter under `smartcontract/service/wasmvm`.
- Host functions register with Wazero runtime.
- Wasm virtual machine initialization and contract execution.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Run Explorer to analyze Wagon usage and devise Wazero integration strategy | none | PLANNED |
| 2 | Implementation | Replace Wagon with Wazero in smartcontract/service/wasmvm and update tests | M1 | PLANNED |
| 3 | Review | Verify correctness, security, error handling, and performance | M2 | PLANNED |
| 4 | Challenger Verification | Run adversarial tests and stress-test the new WASM VM | M3 | PLANNED |
| 5 | Forensic Audit | Verify compliance with zero-cheating policies and verify correct VM execution | M4 | PLANNED |

## Interface Contracts
### Wasm VM Runtime
- Wazero Runtime executes Wasm bytecode.
- Registers standard Ontology host functions under `env` module name.
- Input and output memory management via Wazero API.
