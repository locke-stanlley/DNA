# Scope: Milestone 6 (Requirement R6: Contract Upgradability)

## Architecture
Smart contract upgradability is achieved by overwriting the contract bytecode and metadata stored in the ledger's cache database (`CacheDB` / `StateStore`) under the existing (original) contract address. Since the address does not change, all storage keys (which are prefixed by the contract address) remain perfectly matched to the upgraded contract, preserving storage state.

We support two interfaces:
1. **Syscall/Interop service function**: `DNA.Contract.Upgrade` (NeoVM) and `ontio_contract_upgrade` (WasmVM).
2. **CLI subcommand**: `./dnaNode contract upgrade`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M6.1: Core Payload changes | Support serialization and override of target address in `DeployCode` payload. | None | PLANNED |
| 2 | M6.2: Ledger Tx Handler changes | Support upgrade action in `HandleDeployTransaction` if target address is specified. | M6.1 | PLANNED |
| 3 | M6.3: NeoVM ContractUpgrade | Implement `DNA.Contract.Upgrade` and map to `ContractUpgrade` in `neovm`. | M6.2 | PLANNED |
| 4 | M6.4: WasmVM ContractUpgrade | Implement `ontio_contract_upgrade` and map in `wasmvm` runtime. | M6.2 | PLANNED |
| 5 | M6.5: CLI Upgrade command | Add `upgrade` subcommand to `./dnaNode contract` command. | M6.2 | PLANNED |
| 6 | M6.6: Integration & Verification | Run unit and E2E verification to ensure storage preservation and logic upgrade. | M6.3, M6.4, M6.5 | PLANNED |

## Interface Contracts
### NeoVM
- API Name: `"DNA.Contract.Upgrade"`
- Arguments: `code []byte, vmType uint32, name []byte, version []byte, author []byte, email []byte, desc []byte` (same signature as `DNA.Contract.Create` / `DNA.Contract.Migrate`)
- Returns: `DeployCode` object (upgraded contract)

### WasmVM
- Exported name: `"ontio_contract_upgrade"`
- Parameters: `codePtr, codeLen, vmType, namePtr, nameLen, verPtr, verLen, authorPtr, authorLen, emailPtr, emailLen, descPtr, descLen, newAddressPtr` (same signature as `"ontio_contract_migrate"`)
- Returns: length of written address in memory (always 20)

### CLI Command
- `./dnaNode contract upgrade --addr <address> --code <code_file> [metadata_flags...]`
