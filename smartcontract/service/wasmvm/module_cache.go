// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

// Package wasmvm provides a compiled Wasm module cache to avoid repeated
// parsing and compilation of the same contract bytecode on every invocation.
// Modules are cached by the SHA256 hash of the raw bytecode.
package wasmvm

import (
	"crypto/sha256"
	"sync"

	"github.com/go-interpreter/wagon/exec"
)

// moduleCacheEntry stores a compiled module with its refcount for eviction.
type moduleCacheEntry struct {
	compiled *exec.CompiledModule
	hits     uint64
}

// CompiledModuleCache is a thread-safe LRU-style cache of compiled Wasm modules.
type CompiledModuleCache struct {
	mu       sync.RWMutex
	entries  map[[32]byte]*moduleCacheEntry
	capacity int
}

// defaultWasmCacheCapacity is the number of distinct contract bytecodes to cache.
const defaultWasmCacheCapacity = 256

// GlobalWasmCache is the process-wide compiled module cache.
var GlobalWasmCache = NewCompiledModuleCache(defaultWasmCacheCapacity)

// NewCompiledModuleCache creates a new cache with the given capacity.
func NewCompiledModuleCache(capacity int) *CompiledModuleCache {
	if capacity <= 0 {
		capacity = defaultWasmCacheCapacity
	}
	return &CompiledModuleCache{
		entries:  make(map[[32]byte]*moduleCacheEntry, capacity),
		capacity: capacity,
	}
}

// codeKey computes the SHA256 hash of the bytecode as the cache key.
func codeKey(code []byte) [32]byte {
	return sha256.Sum256(code)
}

// Get returns the cached compiled module for the given bytecode, or nil if not found.
func (c *CompiledModuleCache) Get(code []byte) *exec.CompiledModule {
	key := codeKey(code)
	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()
	if !ok {
		return nil
	}
	c.mu.Lock()
	entry.hits++
	c.mu.Unlock()
	return entry.compiled
}

// Put stores a compiled module in the cache.
// If the cache is full, the entry with the lowest hit count is evicted.
func (c *CompiledModuleCache) Put(code []byte, compiled *exec.CompiledModule) {
	key := codeKey(code)
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, exists := c.entries[key]; exists {
		return // already cached
	}

	// Evict the entry with the lowest hits when at capacity
	if len(c.entries) >= c.capacity {
		var evictKey [32]byte
		var minHits uint64 = ^uint64(0)
		for k, e := range c.entries {
			if e.hits < minHits {
				minHits = e.hits
				evictKey = k
			}
		}
		delete(c.entries, evictKey)
	}

	c.entries[key] = &moduleCacheEntry{
		compiled: compiled,
		hits:     1,
	}
}

// ReadWasmModuleCached is a caching version of ReadWasmModule.
// It checks the GlobalWasmCache first before parsing/compiling the module.
func ReadWasmModuleCached(code []byte, verify bool) (*exec.CompiledModule, error) {
	// Only cache verified (deployed) modules; preexec calls skip cache
	if verify {
		if cached := GlobalWasmCache.Get(code); cached != nil {
			return cached, nil
		}
	}

	compiled, err := ReadWasmModule(code, verify)
	if err != nil {
		return nil, err
	}

	if verify {
		GlobalWasmCache.Put(code, compiled)
	}

	return compiled, nil
}
