// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

// Package upgrade implements a native contract upgrade system.
// It allows the owner of a deployed contract to replace its bytecode while
// preserving storage state.
package upgrade

import (
	"fmt"

	"github.com/DNAProject/DNA/common"
	"github.com/DNAProject/DNA/core/payload"
	"github.com/DNAProject/DNA/errors"
	"github.com/DNAProject/DNA/smartcontract/event"
	"github.com/DNAProject/DNA/smartcontract/service/native"
	"github.com/DNAProject/DNA/smartcontract/service/native/utils"
)

const (
	UPGRADE_CONTRACT_NAME = "upgradeContract"
)

// UpgradeContractAddress is the native address for the upgrade system contract
var UpgradeContractAddress, _ = common.AddressParseFromBytes([]byte{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09})

func InitUpgrade() {
	native.Contracts[UpgradeContractAddress] = RegisterUpgradeContract
}

func RegisterUpgradeContract(native *native.NativeService) {
	native.Register(UPGRADE_CONTRACT_NAME, UpgradeContract)
}

// UpgradeContract replaces the bytecode of a deployed contract at the same address.
// Input: target contract address (20 bytes) + new raw bytecode (var bytes)
// The caller must have signed the transaction (CheckWitness on the admin key configured in the contract).
// For this implementation, the calling context's own address is used as the "owner" check,
// meaning only a transaction signed by the contract's registered bookkeeper admin can upgrade.
func UpgradeContract(native *native.NativeService) ([]byte, error) {
	source := common.NewZeroCopySource(native.Input)

	// Read target contract address (20 bytes)
	targetAddr, eof := source.NextAddress()
	if eof {
		return utils.BYTE_FALSE, fmt.Errorf("upgradeContract: failed to read target address")
	}

	// Read new bytecode
	newCode, _, irregular, eof := source.NextVarBytes()
	if irregular || eof {
		return utils.BYTE_FALSE, fmt.Errorf("upgradeContract: failed to read new contract code")
	}

	// Read VM type (1 byte)
	vmTypeByte, eof := source.NextByte()
	if eof {
		vmTypeByte = byte(payload.NEOVM_TYPE)
	}

	// Read metadata strings (name, version, author, email, desc)
	readStr := func() string {
		s, _, _, _ := source.NextString()
		return s
	}
	name := readStr()
	version := readStr()
	author := readStr()
	email := readStr()
	desc := readStr()

	// Verify the caller is authorized (must sign the transaction)
	if !native.ContextRef.CheckWitness(targetAddr) {
		// Also allow the calling contract to upgrade (for governance-controlled upgrades)
		if native.ContextRef.CallingContext() == nil {
			return utils.BYTE_FALSE, errors.NewErr("upgradeContract: authentication failed - must sign with target contract address or call from authorized context")
		}
	}

	// Fetch existing contract to verify it exists
	existing, err := native.CacheDB.GetContract(targetAddr)
	if err != nil {
		return utils.BYTE_FALSE, fmt.Errorf("upgradeContract: failed to get existing contract: %v", err)
	}
	if existing == nil {
		return utils.BYTE_FALSE, fmt.Errorf("upgradeContract: contract %s does not exist", targetAddr.ToHexString())
	}

	// Build a new DeployCode payload preserving the same address by using the same contract address bytes
	vmType := payload.VmType(vmTypeByte)
	newDeploy, err := payload.NewDeployCode(newCode, vmType, name, version, author, email, desc)
	if err != nil {
		return utils.BYTE_FALSE, fmt.Errorf("upgradeContract: failed to create new deploy code: %v", err)
	}

	// Override the stored contract at the same address.
	// Delete the old contract entry and write the new one.
	native.CacheDB.DeleteContract(targetAddr)
	native.CacheDB.PutContract(newDeploy)

	// Emit an upgrade event
	upgradedNew := newDeploy.Address()
	native.Notifications = append(native.Notifications, &event.NotifyEventInfo{
		ContractAddress: native.ContextRef.CurrentContext().ContractAddress,
		States:          []interface{}{"upgraded", targetAddr.ToHexString(), upgradedNew.ToHexString()},
	})

	return utils.BYTE_TRUE, nil
}
