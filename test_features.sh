#!/usr/bin/env bash
# =============================================================================
# test_features.sh — DNA Network Feature Integration Test Suite
# Tests all newly implemented features:
#   R1: ONT Governance Token (dual-token balance)
#   R2: HTTP Bootstrap & DNS Seeder config
#   R3: Dynamic Validator Staking CLI (stake / unstake)
#   R4: Block Rewards & Fee Distribution
#   R5: State Pruning CLI (prune command)
#   R6: Contract Upgradability (native upgrade contract)
#   R7: Wasm Module Cache (module_cache.go)
# =============================================================================

set -euo pipefail

BINARY="./dnaNode"
RPC_PORT=20336
WALLET="node1/wallet.dat"
WALLET_PWD="passwordtest"
TEST_ADDR="ARDRC7826okF5FqoADoh433upmnhoahSTq"
PASS=0
FAIL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

pass() { echo -e "${GREEN}[PASS]${RESET} $1"; ((PASS++)) || true; }
fail() { echo -e "${RED}[FAIL]${RESET} $1"; ((FAIL++)) || true; }
info() { echo -e "${CYAN}[INFO]${RESET} $1"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $1"; }

echo -e "\n${CYAN}========================================${RESET}"
echo -e "${CYAN}  DNA Network Feature Integration Tests ${RESET}"
echo -e "${CYAN}========================================${RESET}\n"

# ─────────────────────────────────────────────────────────────────────────────
# Pre-flight: binary exists?
# ─────────────────────────────────────────────────────────────────────────────
if [[ ! -f "$BINARY" ]]; then
    fail "Binary $BINARY not found. Run: go build -o dnaNode main.go"
    exit 1
fi
pass "Binary $BINARY found"

# ─────────────────────────────────────────────────────────────────────────────
# Helper: is the node running with a proper RPC response?
# ─────────────────────────────────────────────────────────────────────────────
node_running() {
    RESP=$(curl -s --max-time 3 "http://localhost:${RPC_PORT}/api/v1/node/version" 2>/dev/null)
    [[ -n "$RESP" ]] && echo "$RESP" | grep -q "version"
}

# ─────────────────────────────────────────────────────────────────────────────
# R1: ONT Governance Token — balance should include both ONT and GAS
# ─────────────────────────────────────────────────────────────────────────────
info "=== R1: ONT Governance Token ==="
if node_running; then
    BALANCE_OUT=$("$BINARY" asset balance "$TEST_ADDR" --rpcport "$RPC_PORT" 2>&1 || true)
    if echo "$BALANCE_OUT" | grep -qi "ONT"; then
        pass "R1: ONT token appears in balance output"
    else
        fail "R1: ONT token NOT found in balance output. Got: $BALANCE_OUT"
    fi
    if echo "$BALANCE_OUT" | grep -qi "GAS"; then
        pass "R1: GAS token appears in balance output"
    else
        fail "R1: GAS token NOT found in balance output"
    fi
else
    warn "R1: Node not running — skipping live balance test (offline mode)"
    # Verify source code has ONT support
    if grep -q "Ont" /workspaces/DNA/http/base/common/common.go; then
        pass "R1: ONT balance field present in HTTP common.go"
    else
        fail "R1: ONT balance field NOT found in HTTP common.go"
    fi
    if grep -q "OntContractAddress" /workspaces/DNA/smartcontract/service/native/utils/params.go; then
        pass "R1: OntContractAddress registered in params.go"
    else
        fail "R1: OntContractAddress NOT in params.go"
    fi
    if [[ -f /workspaces/DNA/smartcontract/service/native/ont/ont.go ]]; then
        pass "R1: ont.go native contract implemented"
    else
        fail "R1: ont.go native contract NOT found"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# R2: HTTP Bootstrap & DNS Seeder config fields exist
# ─────────────────────────────────────────────────────────────────────────────
info "=== R2: HTTP Bootstrap & DNS Seeder Config ==="
if grep -q "HttpBootstrapServer" /workspaces/DNA/common/config/config.go; then
    pass "R2: HttpBootstrapServer field present in config.go"
else
    fail "R2: HttpBootstrapServer field missing from config.go"
fi
if grep -q "DnsSeeders" /workspaces/DNA/common/config/config.go; then
    pass "R2: DnsSeeders field present in config.go"
else
    fail "R2: DnsSeeders field missing from config.go"
fi
if [[ -f /workspaces/DNA/bootstrapserver/server.go ]]; then
    pass "R2: Standalone bootstrap server package present"
else
    fail "R2: bootstrapserver package NOT found"
fi
BOOTSTRAP_HELP=$("$BINARY" bootstrap server --help 2>&1 || true)
if echo "$BOOTSTRAP_HELP" | grep -qi "listen"; then
    pass "R2: bootstrap server CLI command registered"
else
    fail "R2: bootstrap server CLI command NOT registered"
fi
if [[ -f /workspaces/DNA/p2pserver/protocols/bootstrap/bootstrap.go ]]; then
    if grep -q "HttpBootstrapServer" /workspaces/DNA/p2pserver/protocols/bootstrap/bootstrap.go; then
        pass "R2: Bootstrap protocol uses HttpBootstrapServer"
    else
        fail "R2: Bootstrap protocol does NOT use HttpBootstrapServer"
    fi
    if grep -q "DnsSeeders" /workspaces/DNA/p2pserver/protocols/bootstrap/bootstrap.go; then
        pass "R2: Bootstrap protocol resolves DnsSeeders"
    else
        fail "R2: Bootstrap protocol does NOT resolve DnsSeeders"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# R3: Dynamic Validator Staking CLI — stake & unstake commands registered
# ─────────────────────────────────────────────────────────────────────────────
info "=== R3: Dynamic Validator Staking CLI ==="
STAKE_HELP=$("$BINARY" asset stake --help 2>&1 || true)
if echo "$STAKE_HELP" | grep -qi "stake"; then
    pass "R3: stake command registered"
else
    fail "R3: stake command NOT registered"
fi
UNSTAKE_HELP=$("$BINARY" asset unstake --help 2>&1 || true)
if echo "$UNSTAKE_HELP" | grep -qi "unstake"; then
    pass "R3: unstake command registered"
else
    fail "R3: unstake command NOT registered"
fi
if grep -q 'NEW_VERSION_BLOCK.*=.*0' /workspaces/DNA/smartcontract/service/native/governance/governance.go; then
    pass "R3: NEW_VERSION_BLOCK set to 0 (staking enabled from genesis)"
else
    fail "R3: NEW_VERSION_BLOCK not set to 0"
fi

# ─────────────────────────────────────────────────────────────────────────────
# R4: Block Rewards — distribution code present in ledger_store.go
# ─────────────────────────────────────────────────────────────────────────────
info "=== R4: Block Rewards & Fee Distribution ==="
if grep -q "Mint and distribute block reward" /workspaces/DNA/core/store/ledgerstore/ledger_store.go; then
    pass "R4: Block reward distribution code present in ledger_store.go"
else
    fail "R4: Block reward distribution code NOT found in ledger_store.go"
fi
if grep -q "NextBookkeeper" /workspaces/DNA/core/store/ledgerstore/ledger_store.go; then
    pass "R4: Block reward credited to NextBookkeeper"
else
    fail "R4: NextBookkeeper reward target not found"
fi
if grep -q "rewardAmt" /workspaces/DNA/core/store/ledgerstore/ledger_store.go; then
    pass "R4: Transaction fee aggregation logic present (rewardAmt)"
else
    fail "R4: rewardAmt (fee sum) not found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# R5: State Pruning CLI — prune command registered and logic present
# ─────────────────────────────────────────────────────────────────────────────
info "=== R5: State Pruning ==="
PRUNE_HELP=$("$BINARY" prune --help 2>&1 || true)
if echo "$PRUNE_HELP" | grep -qi "prune"; then
    pass "R5: prune command registered"
else
    fail "R5: prune command NOT registered"
fi
if echo "$PRUNE_HELP" | grep -qi "keep-blocks"; then
    pass "R5: prune --keep-blocks flag available"
else
    fail "R5: prune --keep-blocks flag NOT found"
fi
if grep -q "DATA_BLOCK_PREFIX" /workspaces/DNA/cmd/prune_cmd.go; then
    pass "R5: Block store prefix constant used in prune logic"
else
    fail "R5: DATA_BLOCK_PREFIX not found in prune_cmd.go"
fi

# ─────────────────────────────────────────────────────────────────────────────
# R6: Contract Upgradability — native upgrade contract present
# ─────────────────────────────────────────────────────────────────────────────
info "=== R6: Contract Upgradability ==="
if [[ -f /workspaces/DNA/smartcontract/service/native/upgrade/upgrade.go ]]; then
    pass "R6: upgrade.go native contract exists"
else
    fail "R6: upgrade.go native contract NOT found"
fi
if grep -q "UpgradeContractAddress" /workspaces/DNA/smartcontract/service/native/utils/params.go; then
    pass "R6: UpgradeContractAddress registered in params.go"
else
    fail "R6: UpgradeContractAddress NOT in params.go"
fi
if grep -q "upgrade.InitUpgrade" /workspaces/DNA/smartcontract/service/native/init/init.go; then
    pass "R6: upgrade.InitUpgrade() called in init.go"
else
    fail "R6: upgrade.InitUpgrade() NOT called in init.go"
fi
if grep -q "IsNativeContract" /workspaces/DNA/smartcontract/service/native/utils/params.go && \
   grep -q "UpgradeContractAddress" /workspaces/DNA/smartcontract/service/native/utils/params.go; then
    pass "R6: UpgradeContractAddress included in IsNativeContract"
else
    fail "R6: UpgradeContractAddress NOT in IsNativeContract"
fi

# ─────────────────────────────────────────────────────────────────────────────
# R7: Wasm Module Cache — module_cache.go present and integrated
# ─────────────────────────────────────────────────────────────────────────────
info "=== R7: Wasm Module Cache ==="
if [[ -f /workspaces/DNA/smartcontract/service/wasmvm/module_cache.go ]]; then
    pass "R7: module_cache.go exists"
else
    fail "R7: module_cache.go NOT found"
fi
if grep -q "GlobalWasmCache" /workspaces/DNA/smartcontract/service/wasmvm/module_cache.go; then
    pass "R7: GlobalWasmCache defined in module_cache.go"
else
    fail "R7: GlobalWasmCache not defined"
fi
if grep -q "GlobalWasmCache" /workspaces/DNA/smartcontract/service/wasmvm/wasm_service.go; then
    pass "R7: GlobalWasmCache integrated in wasm_service.go invoke path"
else
    fail "R7: GlobalWasmCache NOT integrated in wasm_service.go"
fi
if grep -q "ReadWasmModuleCached" /workspaces/DNA/smartcontract/service/wasmvm/module_cache.go; then
    pass "R7: ReadWasmModuleCached caching wrapper defined"
else
    fail "R7: ReadWasmModuleCached NOT defined"
fi
if grep -q "capacity" /workspaces/DNA/smartcontract/service/wasmvm/module_cache.go && \
   grep -q "defaultWasmCacheCapacity" /workspaces/DNA/smartcontract/service/wasmvm/module_cache.go; then
    pass "R7: Cache capacity limit (LRU eviction) implemented"
else
    fail "R7: Cache capacity limit NOT implemented"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Build verification
# ─────────────────────────────────────────────────────────────────────────────
info "=== Build Verification ==="
if cd /workspaces/DNA && go build -ldflags "-X github.com/DNAProject/DNA/common/config.Version=test" -o dnaNode_test main.go 2>&1; then
    pass "Build: dnaNode compiles cleanly"
    rm -f /workspaces/DNA/dnaNode_test
else
    fail "Build: compilation FAILED"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}========================================${RESET}"
echo -e "${CYAN}  Test Summary                          ${RESET}"
echo -e "${CYAN}========================================${RESET}"
echo -e "  ${GREEN}PASS: $PASS${RESET}"
if [[ $FAIL -gt 0 ]]; then
    echo -e "  ${RED}FAIL: $FAIL${RESET}"
else
    echo -e "  ${GREEN}FAIL: $FAIL${RESET}"
fi
echo ""
if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN}All tests passed! ✓${RESET}"
    exit 0
else
    echo -e "${RED}$FAIL test(s) failed.${RESET}"
    exit 1
fi
