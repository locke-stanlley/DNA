// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

package ont

import (
	"fmt"
	"math/big"

	"github.com/DNAProject/DNA/common"
	"github.com/DNAProject/DNA/common/constants"
	"github.com/DNAProject/DNA/errors"
	"github.com/DNAProject/DNA/smartcontract/service/native"
	"github.com/DNAProject/DNA/smartcontract/service/native/utils"
)

const (
	TRANSFER_FLAG byte = 1
	APPROVE_FLAG  byte = 2

	UNBOUND_TIME_OFFSET = "unboundTimeOffset"
	UNBOUND_GAS         = "unboundGas"
	TOTAL_SUPPLY_NAME   = "totalSupply"

	INIT_NAME           = "init"
	TRANSFER_NAME       = "transfer"
	APPROVE_NAME        = "approve"
	TRANSFERFROM_NAME   = "transferFrom"
	NAME_NAME           = "name"
	SYMBOL_NAME         = "symbol"
	DECIMALS_NAME       = "decimals"
	TOTALSUPPLY_NAME    = "totalSupply"
	BALANCEOF_NAME      = "balanceOf"
	ALLOWANCE_NAME      = "allowance"
	UNBOUND_NAME        = "unbound"
	CLAIM_GAS_NAME      = "claimGas"
)

func InitOnt() {
	native.Contracts[utils.OntContractAddress] = RegisterOntContract
}

func RegisterOntContract(native *native.NativeService) {
	native.Register(INIT_NAME, OntInit)
	native.Register(TRANSFER_NAME, OntTransfer)
	native.Register(APPROVE_NAME, OntApprove)
	native.Register(TRANSFERFROM_NAME, OntTransferFrom)
	native.Register(NAME_NAME, OntName)
	native.Register(SYMBOL_NAME, OntSymbol)
	native.Register(DECIMALS_NAME, OntDecimals)
	native.Register(TOTALSUPPLY_NAME, OntTotalSupply)
	native.Register(BALANCEOF_NAME, OntBalanceOf)
	native.Register(ALLOWANCE_NAME, OntAllowance)
	native.Register(UNBOUND_NAME, OntUnbound)
	native.Register(CLAIM_GAS_NAME, OntClaimGas)
}

func GenBalanceKey(contract common.Address, address common.Address) []byte {
	return append(append(contract[:], byte(1)), address[:]...)
}

func GenApproveKey(contract common.Address, from, to common.Address) []byte {
	return append(append(append(contract[:], byte(2)), from[:]...), to[:]...)
}

func GenTotalSupplyKey(contract common.Address) []byte {
	return append(contract[:], []byte(TOTAL_SUPPLY_NAME)...)
}

func genAddressUnboundOffsetKey(contract, address common.Address) []byte {
	return append(append(contract[:], []byte(UNBOUND_TIME_OFFSET)...), address[:]...)
}

func genAddressUnboundGasKey(contract, address common.Address) []byte {
	return append(append(contract[:], []byte(UNBOUND_GAS)...), address[:]...)
}

// Structs for state
type Transfers struct {
	States []State
}

func (this *Transfers) Serialization(sink *common.ZeroCopySink) {
	utils.EncodeVarUint(sink, uint64(len(this.States)))
	for _, v := range this.States {
		v.Serialization(sink)
	}
}

func (this *Transfers) Deserialization(source *common.ZeroCopySource) error {
	n, err := utils.DecodeVarUint(source)
	if err != nil {
		return err
	}
	for i := 0; uint64(i) < n; i++ {
		var state State
		if err := state.Deserialization(source); err != nil {
			return err
		}
		this.States = append(this.States, state)
	}
	return nil
}

type State struct {
	From  common.Address
	To    common.Address
	Value uint64
}

func (this *State) Serialization(sink *common.ZeroCopySink) {
	utils.EncodeAddress(sink, this.From)
	utils.EncodeAddress(sink, this.To)
	utils.EncodeVarUint(sink, this.Value)
}

func (this *State) Deserialization(source *common.ZeroCopySource) error {
	var err error
	this.From, err = utils.DecodeAddress(source)
	if err != nil {
		return err
	}
	this.To, err = utils.DecodeAddress(source)
	if err != nil {
		return err
	}
	this.Value, err = utils.DecodeVarUint(source)
	return err
}

type TransferFrom struct {
	Sender common.Address
	From   common.Address
	To     common.Address
	Value  uint64
}

func (this *TransferFrom) Serialization(sink *common.ZeroCopySink) {
	utils.EncodeAddress(sink, this.Sender)
	utils.EncodeAddress(sink, this.From)
	utils.EncodeAddress(sink, this.To)
	utils.EncodeVarUint(sink, this.Value)
}

func (this *TransferFrom) Deserialization(source *common.ZeroCopySource) error {
	var err error
	this.Sender, err = utils.DecodeAddress(source)
	if err != nil {
		return err
	}
	this.From, err = utils.DecodeAddress(source)
	if err != nil {
		return err
	}
	this.To, err = utils.DecodeAddress(source)
	if err != nil {
		return err
	}
	this.Value, err = utils.DecodeVarUint(source)
	return err
}

func OntInit(native *native.NativeService) ([]byte, error) {
	contract := native.ContextRef.CurrentContext().ContractAddress
	amount, err := utils.GetStorageUInt64(native, GenTotalSupplyKey(contract))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	if amount > 0 {
		return utils.BYTE_FALSE, errors.NewErr("Init has been completed!")
	}

	distribute := make(map[common.Address]uint64)
	source := common.NewZeroCopySource(native.Input)
	buf, _, irregular, eof := source.NextVarBytes()
	if eof {
		return utils.BYTE_FALSE, fmt.Errorf("serialize error")
	}
	if irregular {
		return utils.BYTE_FALSE, common.ErrIrregularData
	}
	input := common.NewZeroCopySource(buf)
	num, err := utils.DecodeVarUint(input)
	if err != nil {
		return utils.BYTE_FALSE, fmt.Errorf("read number error:%v", err)
	}
	sum := uint64(0)
	overflow := false
	for i := uint64(0); i < num; i++ {
		addr, err := utils.DecodeAddress(input)
		if err != nil {
			return utils.BYTE_FALSE, fmt.Errorf("read address error:%v", err)
		}
		value, err := utils.DecodeVarUint(input)
		if err != nil {
			return utils.BYTE_FALSE, fmt.Errorf("read value error:%v", err)
		}
		sum, overflow = common.SafeAdd(sum, value)
		if overflow {
			return utils.BYTE_FALSE, errors.NewErr("wrong config. overflow detected")
		}
		distribute[addr] += value
	}
	if sum != constants.ONT_TOTAL_SUPPLY {
		return utils.BYTE_FALSE, fmt.Errorf("wrong config. total supply %d != %d", sum, constants.ONT_TOTAL_SUPPLY)
	}

	for addr, val := range distribute {
		balanceKey := GenBalanceKey(contract, addr)
		item := utils.GenUInt64StorageItem(val)
		native.CacheDB.Put(balanceKey, item.ToArray())

		// Initialize unbinding offset to current time
		timeOffset := native.Time - constants.GENESIS_BLOCK_TIMESTAMP
		native.CacheDB.Put(genAddressUnboundOffsetKey(contract, addr), utils.GenUInt32StorageItem(timeOffset).ToArray())
	}
	native.CacheDB.Put(GenTotalSupplyKey(contract), utils.GenUInt64StorageItem(constants.ONT_TOTAL_SUPPLY).ToArray())
	return utils.BYTE_TRUE, nil
}

func updateUnbound(native *native.NativeService, contract common.Address, address common.Address) error {
	balance, err := utils.GetStorageUInt64(native, GenBalanceKey(contract, address))
	if err != nil {
		return err
	}
	timeOffset := native.Time - constants.GENESIS_BLOCK_TIMESTAMP
	preOffset, err := utils.GetStorageUInt32(native, genAddressUnboundOffsetKey(contract, address))
	if err != nil {
		return err
	}
	
	unbound := utils.CalcUnbindOng(balance, preOffset, timeOffset)
	
	preUnbound, err := utils.GetStorageUInt64(native, genAddressUnboundGasKey(contract, address))
	if err != nil {
		return err
	}
	
	native.CacheDB.Put(genAddressUnboundGasKey(contract, address), utils.GenUInt64StorageItem(preUnbound+unbound).ToArray())
	native.CacheDB.Put(genAddressUnboundOffsetKey(contract, address), utils.GenUInt32StorageItem(timeOffset).ToArray())
	return nil
}

func OntTransfer(native *native.NativeService) ([]byte, error) {
	var transfers Transfers
	source := common.NewZeroCopySource(native.Input)
	if err := transfers.Deserialization(source); err != nil {
		return utils.BYTE_FALSE, err
	}
	contract := native.ContextRef.CurrentContext().ContractAddress
	for _, state := range transfers.States {
		if state.Value == 0 {
			continue
		}
		if native.ContextRef.CheckWitness(state.From) == false {
			return utils.BYTE_FALSE, errors.NewErr("authentication failed!")
		}

		// Update unbound for both From and To before changing balance
		if err := updateUnbound(native, contract, state.From); err != nil {
			return utils.BYTE_FALSE, err
		}
		if err := updateUnbound(native, contract, state.To); err != nil {
			return utils.BYTE_FALSE, err
		}

		fromKey := GenBalanceKey(contract, state.From)
		toKey := GenBalanceKey(contract, state.To)
		
		fromBalance, err := utils.GetStorageUInt64(native, fromKey)
		if err != nil {
			return utils.BYTE_FALSE, err
		}
		if fromBalance < state.Value {
			return utils.BYTE_FALSE, fmt.Errorf("insufficient balance")
		}
		
		if fromBalance == state.Value {
			native.CacheDB.Delete(fromKey)
		} else {
			native.CacheDB.Put(fromKey, utils.GenUInt64StorageItem(fromBalance-state.Value).ToArray())
		}
		
		toBalance, err := utils.GetStorageUInt64(native, toKey)
		if err != nil {
			return utils.BYTE_FALSE, err
		}
		native.CacheDB.Put(toKey, utils.GenUInt64StorageItem(toBalance+state.Value).ToArray())
	}
	return utils.BYTE_TRUE, nil
}

func OntApprove(native *native.NativeService) ([]byte, error) {
	var state State
	source := common.NewZeroCopySource(native.Input)
	if err := state.Deserialization(source); err != nil {
		return utils.BYTE_FALSE, err
	}
	if state.Value > constants.ONT_TOTAL_SUPPLY {
		return utils.BYTE_FALSE, fmt.Errorf("overflow")
	}
	if native.ContextRef.CheckWitness(state.From) == false {
		return utils.BYTE_FALSE, errors.NewErr("authentication failed!")
	}
	contract := native.ContextRef.CurrentContext().ContractAddress
	native.CacheDB.Put(GenApproveKey(contract, state.From, state.To), utils.GenUInt64StorageItem(state.Value).ToArray())
	return utils.BYTE_TRUE, nil
}

func OntTransferFrom(native *native.NativeService) ([]byte, error) {
	var tf TransferFrom
	source := common.NewZeroCopySource(native.Input)
	if err := tf.Deserialization(source); err != nil {
		return utils.BYTE_FALSE, err
	}
	if tf.Value == 0 {
		return utils.BYTE_TRUE, nil
	}
	if native.ContextRef.CheckWitness(tf.Sender) == false {
		return utils.BYTE_FALSE, errors.NewErr("authentication failed!")
	}
	contract := native.ContextRef.CurrentContext().ContractAddress
	approveKey := GenApproveKey(contract, tf.From, tf.Sender)
	approveVal, err := utils.GetStorageUInt64(native, approveKey)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	if approveVal < tf.Value {
		return utils.BYTE_FALSE, fmt.Errorf("insufficient allowance")
	}

	// Update unbound
	if err := updateUnbound(native, contract, tf.From); err != nil {
		return utils.BYTE_FALSE, err
	}
	if err := updateUnbound(native, contract, tf.To); err != nil {
		return utils.BYTE_FALSE, err
	}

	fromKey := GenBalanceKey(contract, tf.From)
	toKey := GenBalanceKey(contract, tf.To)

	fromBalance, err := utils.GetStorageUInt64(native, fromKey)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	if fromBalance < tf.Value {
		return utils.BYTE_FALSE, fmt.Errorf("insufficient balance")
	}

	if approveVal == tf.Value {
		native.CacheDB.Delete(approveKey)
	} else {
		native.CacheDB.Put(approveKey, utils.GenUInt64StorageItem(approveVal-tf.Value).ToArray())
	}

	if fromBalance == tf.Value {
		native.CacheDB.Delete(fromKey)
	} else {
		native.CacheDB.Put(fromKey, utils.GenUInt64StorageItem(fromBalance-tf.Value).ToArray())
	}

	toBalance, err := utils.GetStorageUInt64(native, toKey)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	native.CacheDB.Put(toKey, utils.GenUInt64StorageItem(toBalance+tf.Value).ToArray())
	return utils.BYTE_TRUE, nil
}

func OntName(native *native.NativeService) ([]byte, error) {
	return []byte(constants.ONT_NAME), nil
}

func OntSymbol(native *native.NativeService) ([]byte, error) {
	return []byte(constants.ONT_SYMBOL), nil
}

func OntDecimals(native *native.NativeService) ([]byte, error) {
	return common.BigIntToNeoBytes(big.NewInt(int64(constants.ONT_DECIMALS))), nil
}

func OntTotalSupply(native *native.NativeService) ([]byte, error) {
	contract := native.ContextRef.CurrentContext().ContractAddress
	amount, err := utils.GetStorageUInt64(native, GenTotalSupplyKey(contract))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	return common.BigIntToNeoBytes(big.NewInt(int64(amount))), nil
}

func OntBalanceOf(native *native.NativeService) ([]byte, error) {
	source := common.NewZeroCopySource(native.Input)
	addr, err := utils.DecodeAddress(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	contract := native.ContextRef.CurrentContext().ContractAddress
	amount, err := utils.GetStorageUInt64(native, GenBalanceKey(contract, addr))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	return common.BigIntToNeoBytes(big.NewInt(int64(amount))), nil
}

func OntAllowance(native *native.NativeService) ([]byte, error) {
	source := common.NewZeroCopySource(native.Input)
	from, err := utils.DecodeAddress(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	to, err := utils.DecodeAddress(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	contract := native.ContextRef.CurrentContext().ContractAddress
	amount, err := utils.GetStorageUInt64(native, GenApproveKey(contract, from, to))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	return common.BigIntToNeoBytes(big.NewInt(int64(amount))), nil
}

func OntUnbound(native *native.NativeService) ([]byte, error) {
	source := common.NewZeroCopySource(native.Input)
	addr, err := utils.DecodeAddress(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	contract := native.ContextRef.CurrentContext().ContractAddress
	
	// Update to get the latest unbound gas
	balance, err := utils.GetStorageUInt64(native, GenBalanceKey(contract, addr))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	timeOffset := native.Time - constants.GENESIS_BLOCK_TIMESTAMP
	preOffset, err := utils.GetStorageUInt32(native, genAddressUnboundOffsetKey(contract, addr))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	unbound := utils.CalcUnbindOng(balance, preOffset, timeOffset)
	preUnbound, err := utils.GetStorageUInt64(native, genAddressUnboundGasKey(contract, addr))
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	totalUnbound := preUnbound + unbound
	return common.BigIntToNeoBytes(big.NewInt(int64(totalUnbound))), nil
}

func OntClaimGas(native *native.NativeService) ([]byte, error) {
	source := common.NewZeroCopySource(native.Input)
	from, err := utils.DecodeAddress(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	to, err := utils.DecodeAddress(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	amount, err := utils.DecodeVarUint(source)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	if native.ContextRef.CheckWitness(from) == false {
		return utils.BYTE_FALSE, errors.NewErr("authentication failed!")
	}
	contract := native.ContextRef.CurrentContext().ContractAddress

	// Force update unbound gas to current block
	if err := updateUnbound(native, contract, from); err != nil {
		return utils.BYTE_FALSE, err
	}

	unboundKey := genAddressUnboundGasKey(contract, from)
	unboundGas, err := utils.GetStorageUInt64(native, unboundKey)
	if err != nil {
		return utils.BYTE_FALSE, err
	}
	if unboundGas < amount {
		return utils.BYTE_FALSE, fmt.Errorf("insufficient unbound gas: have %d, want %d", unboundGas, amount)
	}

	// Invoke GAS contract's transfer to send GAS from ONT contract to claimant address `to`
	type transfersState struct {
		States []State
	}
	transferParams := &transfersState{
		States: []State{
			{
				From:  utils.OntContractAddress,
				To:    to,
				Value: amount,
			},
		},
	}
	
	// We need Transfers serialization format which includes length prefix
	ts := Transfers{States: transferParams.States}
	tsSink := common.NewZeroCopySink(nil)
	ts.Serialization(tsSink)

	_, err = native.NativeCall(utils.GasContractAddress, "transfer", tsSink.Bytes())
	if err != nil {
		return utils.BYTE_FALSE, fmt.Errorf("call gas transfer failed: %v", err)
	}

	// Update claimant's stored unbound gas balance
	if unboundGas == amount {
		native.CacheDB.Delete(unboundKey)
	} else {
		native.CacheDB.Put(unboundKey, utils.GenUInt64StorageItem(unboundGas-amount).ToArray())
	}

	return utils.BYTE_TRUE, nil
}
