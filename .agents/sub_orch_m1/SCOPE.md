# Scope: Milestone 1: ONT Governance Token

## Architecture
- Introduce the ONT native token contract under `utils.OntContractAddress` (`0x01`).
- Register the ONT contract in native services and initialize it in `init()`.
- Add genesis initialization for ONT in `core/genesis/genesis.go` distributing 1,000,000,000 ONT to the genesis bookkeeper.
- Support dual-token unbound GAS model:
  - Track ONT balances, `unboundTimeOffset`, and `unboundGas` accumulated.
  - Calculate and update unbound GAS on every ONT transfer.
  - Provide a `claimGas(from, to, amount)` method in the ONT contract to claim unbound GAS, which invokes the GAS contract to transfer GAS from `utils.OntContractAddress` to the claimant.
- Expose ONT and unbound GAS via RPC / CLI:
  - Update `http/base/common/common.go` to query ONT balance in `GetBalance` and return it.
  - Update `cmd/utils/gas.go` to support ONT in transactions.
  - Update `cmd/asset_cmd.go` to display ONT balance.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1.1 | Define ONT address & interfaces | Add OntContractAddress in utils/params.go, register in IsNativeContract | none | PLANNED |
| 1.2 | Implement ONT contract | Create `smartcontract/service/native/ont` package with full dual-token unbinding and claim logic | 1.1 | PLANNED |
| 1.3 | Register & Initialize ONT | Update `init/init.go` to call `ont.InitOnt()`, and update `core/genesis/genesis.go` to build and deploy ONT contract in genesis block | 1.2 | PLANNED |
| 1.4 | CLI & RPC updates | Update `common/common.go` and `cmd/utils/gas.go`, `cmd/asset_cmd.go` to query and display ONT balance | 1.3 | PLANNED |
| 1.5 | Verification | Build and run tests to verify balance querying and unbound GAS claim model | 1.4 | PLANNED |

## Interface Contracts
- Native contract address: `0x01` (`OntContractAddress`).
- Methods: `init`, `transfer`, `approve`, `transferFrom`, `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `allowance`, `unbound`, `claimGas`.
- `./dnaNode asset balance` outputs both ONT and GAS balances.
