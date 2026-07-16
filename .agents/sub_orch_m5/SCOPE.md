# Scope: Milestone 5 (R5: Fast Sync & State Pruning)

## Architecture
- **Headers-First Fast Synchronization**:
  - We optimize the existing headers-first synchronization by adding an option `EnableFastSync`.
  - When `EnableFastSync` is enabled:
    - We increase parallel block downloads by bumping flight limit (`SYNC_MAX_FLIGHT_BLOCK_SIZE`) and cache capacity (`SYNC_MAX_BLOCK_CACHE_SIZE`).
    - We configure database writes to use `NoSync: true` on LevelDB to speed up storage performance during initial sync.
- **Database State Pruning**:
  - We add options `EnablePruning` and `KeepBlocks` (defaulting to 1000).
  - When `EnablePruning` is enabled:
    - Every 100 blocks, a background task or post-commit trigger deletes keys older than `currentBlockHeight - KeepBlocks` from `BlockStore` (block headers, transactions, block hashes), `EventStore` (event notifications), and `StateStore` (state merkle roots).
    - We maintain a persistent record of the last pruned height in the database to resume pruning correctly.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | CLI & Config Setup | Add config options and CLI flags for fast-sync and pruning | none | PLANNED |
| 2 | Headers-First Fast Sync | Implement the parallelization and fast-write optimizations | M1 | PLANNED |
| 3 | Database State Pruning | Implement the deletion of old headers, transactions, state roots, and events | M1 | PLANNED |
| 4 | E2E Verification | Create test cases to verify sync performance and DB size reduction after pruning | M2, M3 | PLANNED |

## Interface Contracts
- **CLI Options**:
  - `--enable-fast-sync`: Enable headers-first fast synchronization
  - `--enable-pruning`: Enable database state pruning
  - `--keep-blocks <number>`: Number of blocks to keep during pruning (default: 1000)
- **Configuration (config.json)**:
  - `Common.EnableFastSync` (bool)
  - `Common.EnablePruning` (bool)
  - `Common.KeepBlocks` (uint32)
