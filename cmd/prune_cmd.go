// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

// Package cmd provides the CLI prune command for state pruning.
// It removes block-history entries from the block store so that the node
// only retains recent state data, reducing disk usage.
package cmd

import (
	"encoding/binary"
	"fmt"

	"github.com/DNAProject/DNA/common/log"
	"github.com/DNAProject/DNA/core/store/leveldbstore"
	"github.com/urfave/cli"
)

// PruneCommand removes stale block transaction data below a given height.
// It operates directly on the LevelDB block store, deleting all
// transaction entries whose block height is below --keep-height blocks ago.
var PruneCommand = cli.Command{
	Name:      "prune",
	Usage:     "Prune historical block data to save disk space",
	ArgsUsage: "",
	Action:    pruneBlocks,
	Flags: []cli.Flag{
		cli.StringFlag{
			Name:  "datadir",
			Value: "./Chain",
			Usage: "Path to the chain data directory",
		},
		cli.Uint64Flag{
			Name:  "keep-blocks",
			Value: 100000,
			Usage: "Number of recent blocks to keep (older entries are pruned)",
		},
	},
	Description: `Prune removes historical block transaction entries from the
local LevelDB block store. Only data for blocks older than
--keep-blocks from the current tip is removed. This operation
is irreversible; back up your data before running.`,
}

// blockStorePath is the relative sub-path within datadir for the block DB.
const blockStorePath = "/Block"

// DATA_BLOCK prefix byte: block height => block hash (0x00)
const DATA_BLOCK_PREFIX = byte(0x00)

// SYS_CURRENT_BLOCK prefix byte (0x10)
const SYS_CURRENT_BLOCK_PREFIX = byte(0x10)

func pruneBlocks(ctx *cli.Context) error {
	dataDir := ctx.String("datadir")
	keepBlocks := ctx.Uint64("keep-blocks")

	log.InitLog(1, log.Stdout)
	log.Infof("[prune] Opening block store at: %s", dataDir+blockStorePath)

	store, err := leveldbstore.NewLevelDBStore(dataDir + blockStorePath)
	if err != nil {
		return fmt.Errorf("[prune] failed to open block store: %v", err)
	}
	defer store.Close()

	// Find current block height by reading SYS_CURRENT_BLOCK key (prefix 0x10)
	currentKey := []byte{SYS_CURRENT_BLOCK_PREFIX}
	val, err := store.Get(currentKey)
	if err != nil || len(val) < 4 {
		return fmt.Errorf("[prune] failed to read current block height: %v", err)
	}
	currentHeight := binary.LittleEndian.Uint32(val[:4])
	log.Infof("[prune] Current block height: %d", currentHeight)

	if uint64(currentHeight) < keepBlocks {
		fmt.Printf("[prune] Nothing to prune: current height %d < keep-blocks %d\n", currentHeight, keepBlocks)
		return nil
	}
	pruneBelow := uint32(uint64(currentHeight) - keepBlocks)
	log.Infof("[prune] Pruning transaction entries below height: %d", pruneBelow)

	// Iterate DATA_BLOCK entries (prefix 0x00) for old heights
	iter := store.NewIterator([]byte{DATA_BLOCK_PREFIX})
	defer iter.Release()

	store.NewBatch()
	pruned := 0
	batch := 0
	const batchSize = 1000

	for iter.Next() {
		key := iter.Key()
		// key = [prefix(1)] [height(4 bytes big-endian)]
		if len(key) < 5 {
			continue
		}
		height := binary.BigEndian.Uint32(key[1:5])
		if height < pruneBelow {
			store.BatchDelete(key)
			pruned++
			batch++
			if batch >= batchSize {
				if err := store.BatchCommit(); err != nil {
					return fmt.Errorf("[prune] batch commit error: %v", err)
				}
				store.NewBatch()
				batch = 0
				log.Infof("[prune] Progress: pruned %d entries...", pruned)
			}
		}
	}

	if batch > 0 {
		if err := store.BatchCommit(); err != nil {
			return fmt.Errorf("[prune] final batch commit error: %v", err)
		}
	}

	fmt.Printf("[prune] Done. Pruned %d block-hash entries below height %d.\n", pruned, pruneBelow)
	return nil
}
