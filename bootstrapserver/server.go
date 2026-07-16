// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

// Package bootstrapserver implements a standalone HTTP peer-discovery server
// used by DNA nodes via P2PNode.HttpBootstrapServer.
package bootstrapserver

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const defaultPeerTTL = 5 * time.Minute

// PeerRecord is a registered node entry returned by the detail API.
type PeerRecord struct {
	Address   string    `json:"address"`
	Port      int       `json:"port"`
	PubKey    string    `json:"pubkey"`
	NodeAddr  string    `json:"nodeAddress"`
	FirstSeen time.Time `json:"firstSeen"`
	LastSeen  time.Time `json:"lastSeen"`
	Source    string    `json:"source"`
}

// Status is returned by GET /status.
type Status struct {
	OK         bool         `json:"ok"`
	Listen     string       `json:"listen"`
	PeerCount  int          `json:"peerCount"`
	StaticSeed int          `json:"staticSeedCount"`
	Uptime     string       `json:"uptime"`
	Peers      []PeerRecord `json:"peers"`
}

// Config configures the bootstrap HTTP server.
type Config struct {
	Listen string
	TTL    time.Duration
	Seeds  []string
}

type peerEntry struct {
	host      string
	port      int
	pubkey    string
	address   string
	firstSeen time.Time
	lastSeen  time.Time
	source    string
}

// Preconfigured mapping of known validators (Node 1 through Node 5)
var knownValidators = map[string]struct{ pubkey, address string }{
	"127.0.0.1:20338": {"03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde", "AX3LEE3rUhinSjcyW5R6Cz6NZZKA16RTMM"},
	"127.0.0.1:20438": {"02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be", "ASsynsUiDCmdGSbAMXgyz6uGDc4EKYpuao"},
	"127.0.0.1:20538": {"0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7", "ARu8bPLsFFgTzUJHs2i8xN5bp6aVF5TnfY"},
	"127.0.0.1:20638": {"03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57", "AdQ9w5GTmjDGCyWAAwhusNaTnCzcnqgf4k"},
	"127.0.0.1:20738": {"03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4", "AdLxFR53J7MGDv1LdfLzxGXpqQZ4xoY1qS"},
}

// Server is a thread-safe HTTP bootstrap peer registry.
type Server struct {
	cfg      Config
	started  time.Time
	mu       sync.RWMutex
	peers    map[string]*peerEntry
	static   map[string]bool
	httpSrv  *http.Server
}

// New creates a bootstrap server with the given configuration.
func New(cfg Config) *Server {
	if cfg.TTL <= 0 {
		cfg.TTL = defaultPeerTTL
	}
	s := &Server{
		cfg:     cfg,
		peers:   make(map[string]*peerEntry),
		static:  make(map[string]bool),
		started: time.Now(),
	}
	for _, seed := range cfg.Seeds {
		host, port, ok := parseHostPort(seed)
		if !ok {
			continue
		}
		key := peerKey(host, port)
		pubkey := ""
		address := ""
		if val, exists := knownValidators[key]; exists {
			pubkey = val.pubkey
			address = val.address
		}
		s.peers[key] = &peerEntry{
			host:      host,
			port:      port,
			pubkey:    pubkey,
			address:   address,
			firstSeen: time.Now(),
			lastSeen:  time.Now(),
			source:    "static",
		}
		s.static[key] = true
	}
	return s
}

// responseWriter wraps http.ResponseWriter to capture HTTP status codes.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// loggingMiddleware logs HTTP request details.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(wrapped, r)
		fmt.Printf("[bootstrap] %s %s %s from %s - Status %d (%v)\n",
			start.Format("2006-01-02 15:04:05"),
			r.Method,
			r.URL.Path,
			r.RemoteAddr,
			wrapped.status,
			time.Since(start),
		)
	})
}

// ListenAndServe starts the HTTP server and blocks until it stops.
func (s *Server) ListenAndServe() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/status", s.handleStatus)
	mux.HandleFunc("/peers", s.handlePeers)
	mux.HandleFunc("/register", s.handleRegister)
	mux.HandleFunc("/heartbeat", s.handleHeartbeat)
	mux.HandleFunc("/unregister", s.handleUnregister)
	mux.HandleFunc("/genesis-config", s.handleGenesisConfig)

	s.httpSrv = &http.Server{
		Addr:    s.cfg.Listen,
		Handler: loggingMiddleware(corsMiddleware(mux)),
	}

	go s.cleanupAndPingLoop()
	fmt.Printf("[bootstrap] listening on http://%s\n", s.cfg.Listen)
	fmt.Printf("[bootstrap] endpoints: GET /peers  POST /register?port=<p2p-port>  GET /status  GET /genesis-config\n")
	return s.httpSrv.ListenAndServe()
}

// Shutdown stops the HTTP server.
func (s *Server) Shutdown() error {
	if s.httpSrv == nil {
		return nil
	}
	return s.httpSrv.Close()
}

// pingPeer checks if the peer is responding on its configured TCP P2P port.
func pingPeer(host string, port int) bool {
	address := net.JoinHostPort(host, strconv.Itoa(port))
	conn, err := net.DialTimeout("tcp", address, 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// cleanupAndPingLoop periodically evicts expired nodes and checks active peer liveness.
func (s *Server) cleanupAndPingLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		s.mu.Lock()

		// 1. Evict expired peers (TTL check)
		for key, p := range s.peers {
			if s.static[key] {
				continue
			}
			if now.Sub(p.lastSeen) > s.cfg.TTL {
				fmt.Printf("[bootstrap] %s EVICT: Peer %s:%d expired (TTL exceeded).\n", now.Format("2006-01-02 15:04:05"), p.host, p.port)
				delete(s.peers, key)
			}
		}

		// 2. Perform dynamic TCP ping checks to verify active peer liveness
		if len(s.peers) > 0 {
			fmt.Printf("[bootstrap] %s Running periodic liveness checks for %d peer(s)...\n", now.Format("2006-01-02 15:04:05"), len(s.peers))
			for key, p := range s.peers {
				address := net.JoinHostPort(p.host, strconv.Itoa(p.port))
				alive := pingPeer(p.host, p.port)
				if alive {
					fmt.Printf("[bootstrap]   -> Peer %s is ALIVE\n", address)
					p.lastSeen = now // update last seen on successful connection
				} else {
					fmt.Printf("[bootstrap]   -> Peer %s is UNRESPONSIVE\n", address)
					if s.static[key] {
						fmt.Printf("[bootstrap]   -> Keeping static seed %s despite failure.\n", address)
					} else {
						fmt.Printf("[bootstrap]   -> Keeping peer in registry (relying on TTL for eviction).\n")
					}
				}
			}
		}

		s.mu.Unlock()
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "service": "dna-bootstrap"})
}

func (s *Server) handleStatus(w http.ResponseWriter, _ *http.Request) {
	records := s.snapshotRecords()
	writeJSON(w, http.StatusOK, Status{
		OK:         true,
		Listen:     s.cfg.Listen,
		PeerCount:  len(records),
		StaticSeed: len(s.static),
		Uptime:     time.Since(s.started).Round(time.Second).String(),
		Peers:      records,
	})
}

func (s *Server) handlePeers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	addrs := s.peerAddresses()
	writeJSON(w, http.StatusOK, addrs)
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	port, ok := parsePort(r)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing or invalid port query parameter"})
		return
	}
	pubkey := r.URL.Query().Get("pubkey")
	address := r.URL.Query().Get("address")
	host := clientHost(r)
	s.upsertPeer(host, port, pubkey, address, "register")
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":      true,
		"address": fmt.Sprintf("%s:%d", host, port),
	})
}

func (s *Server) handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	port, ok := parsePort(r)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing or invalid port query parameter"})
		return
	}
	pubkey := r.URL.Query().Get("pubkey")
	address := r.URL.Query().Get("address")
	host := clientHost(r)
	s.upsertPeer(host, port, pubkey, address, "heartbeat")
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":      true,
		"address": fmt.Sprintf("%s:%d", host, port),
	})
}

func (s *Server) handleUnregister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	port, ok := parsePort(r)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing or invalid port query parameter"})
		return
	}
	host := clientHost(r)
	key := peerKey(host, port)
	s.mu.Lock()
	deleted := false
	if !s.static[key] {
		if _, exists := s.peers[key]; exists {
			delete(s.peers, key)
			deleted = true
		}
	}
	s.mu.Unlock()

	if deleted {
		fmt.Printf("[bootstrap] UNREGISTER: Peer %s:%d unregistered successfully.\n", host, port)
	} else {
		fmt.Printf("[bootstrap] UNREGISTER: Received unregister request for non-existent or static peer %s:%d.\n", host, port)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true})
}

func (s *Server) handleGenesisConfig(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// 1. Build SeedList dynamically from registered/static peers
	seedList := make([]string, 0)
	for _, p := range s.peers {
		seedList = append(seedList, fmt.Sprintf("%s:%d", p.host, p.port))
	}
	// Fallback to default seed list if no peers registered yet
	if len(seedList) == 0 {
		seedList = []string{
			"127.0.0.1:20338",
			"127.0.0.1:20438",
			"127.0.0.1:20538",
			"127.0.0.1:20638",
			"127.0.0.1:20738",
		}
	}

	// 2. Define the fallback validator list (Default contains all 5 nodes)
	peers := []map[string]interface{}{
		{
			"index":      1,
			"peerPubkey": "03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde",
			"address":    "AX3LEE3rUhinSjcyW5R6Cz6NZZKA16RTMM",
			"initPos":    10000,
		},
		{
			"index":      2,
			"peerPubkey": "02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be",
			"address":    "ASsynsUiDCmdGSbAMXgyz6uGDc4EKYpuao",
			"initPos":    10000,
		},
		{
			"index":      3,
			"peerPubkey": "0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7",
			"address":    "ARu8bPLsFFgTzUJHs2i8xN5bp6aVF5TnfY",
			"initPos":    10000,
		},
		{
			"index":      4,
			"peerPubkey": "03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57",
			"address":    "AdQ9w5GTmjDGCyWAAwhusNaTnCzcnqgf4k",
			"initPos":    10000,
		},
		{
			"index":      5,
			"peerPubkey": "03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4",
			"address":    "AdLxFR53J7MGDv1LdfLzxGXpqQZ4xoY1qS",
			"initPos":    10000,
		},
	}

	// Dynamically build validator list from active registered peers if they registered with keys
	customPeers := make([]map[string]interface{}, 0)
	
	// Collect keys and sort them alphabetically to ensure deterministic order (Go map iteration is random)
	peerKeys := make([]string, 0, len(s.peers))
	for k := range s.peers {
		peerKeys = append(peerKeys, k)
	}
	sort.Strings(peerKeys)

	idx := 1
	for _, k := range peerKeys {
		p := s.peers[k]
		if p.pubkey != "" && p.address != "" {
			customPeers = append(customPeers, map[string]interface{}{
				"index":      idx,
				"peerPubkey": p.pubkey,
				"address":    p.address,
				"initPos":    10000,
			})
			idx++
		}
	}
	if len(customPeers) >= 4 {
		peers = customPeers
	}

	// Calculate L value: L must be >= 16*K and K must be times of L
	kVal := len(peers)
	lVal := 64
	if kVal*16 > lVal {
		lVal = kVal * 16
	}
	if kVal > 0 && lVal%kVal != 0 {
		lVal = lVal + (kVal - (lVal % kVal))
	}

	vbft := map[string]interface{}{
		"n":                      kVal,
		"c":                      1,
		"k":                      kVal,
		"l":                      lVal,
		"block_msg_delay":        10000,
		"hash_msg_delay":         10000,
		"peer_handshake_timeout": 10,
		"max_block_change_view":  3000,
		"admin_ont_id":           "did:dna:AMAx993nE6NEqZjwBssUfopxnnvTdob9ij",
		"min_init_stake":         10000,
		"vrf_value":              "1c9810aa9822e511d5804a9c4db9dd08497c31087b0daafa34d768a3253441fa20515e2f30f81741102af0ca3cefc4818fef16adb825fbaa8cad78647f3afb590e",
		"vrf_proof":              "c57741f934042cb8d8b087b44b161db56fc3ffd4ffb675d36cd09f83935be853d8729f3f5298d12d6fd28d45dde515a4b9d7f67682d182ba5118abf451ff1988",
		"peers":                  peers,
	}

	// Dynamically determine the bootstrap server URL based on the request host and protocol headers
	scheme := "http"
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}

	isLocal := strings.Contains(host, "localhost") || strings.Contains(host, "127.0.0.1") || strings.Contains(host, "[::1]")
	if !isLocal && (r.Header.Get("X-Forwarded-Proto") == "https" || r.TLS != nil) {
		scheme = "https"
	}

	if strings.Contains(host, "localhost") {
		host = strings.Replace(host, "localhost", "127.0.0.1", 1)
	} else if strings.Contains(host, "[::1]") {
		host = strings.Replace(host, "[::1]", "127.0.0.1", 1)
	}
	bootstrapURL := fmt.Sprintf("%s://%s", scheme, host)

	genesisConfig := map[string]interface{}{
		"SeedList":      seedList,
		"ConsensusType": "vbft",
		"VBFT":          vbft,
		"P2PNode": map[string]interface{}{
			"HttpBootstrapServer": bootstrapURL,
			"DnsSeeders":          []string{},
		},
	}

	writeJSON(w, http.StatusOK, genesisConfig)
}

func (s *Server) upsertPeer(host string, port int, pubkey string, address string, source string) {
	key := peerKey(host, port)
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	if p, ok := s.peers[key]; ok {
		p.lastSeen = now
		if pubkey != "" {
			p.pubkey = pubkey
		}
		if address != "" {
			p.address = address
		}
		fmt.Printf("[bootstrap] UPDATE: Peer %s:%d (pubkey: %s, address: %s) updated last seen via %s.\n", host, port, p.pubkey, p.address, source)
		return
	}
	s.peers[key] = &peerEntry{
		host:      host,
		port:      port,
		pubkey:    pubkey,
		address:   address,
		firstSeen: now,
		lastSeen:  now,
		source:    source,
	}
	fmt.Printf("[bootstrap] NEW PEER: Peer %s:%d (pubkey: %s, address: %s) registered successfully (source: %s).\n", host, port, pubkey, address, source)
}

func (s *Server) peerAddresses() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.peers))
	for _, p := range s.peers {
		out = append(out, fmt.Sprintf("%s:%d", p.host, p.port))
	}
	return out
}

func (s *Server) snapshotRecords() []PeerRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]PeerRecord, 0, len(s.peers))
	for _, p := range s.peers {
		out = append(out, PeerRecord{
			Address:   p.host,
			Port:      p.port,
			PubKey:    p.pubkey,
			NodeAddr:  p.address,
			FirstSeen: p.firstSeen,
			LastSeen:  p.lastSeen,
			Source:    p.source,
		})
	}
	return out
}

func parsePort(r *http.Request) (int, bool) {
	raw := strings.TrimSpace(r.URL.Query().Get("port"))
	if raw == "" {
		return 0, false
	}
	port, err := strconv.Atoi(raw)
	if err != nil || port <= 0 || port > 65535 {
		return 0, false
	}
	return port, true
}

func clientHost(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if host := strings.TrimSpace(parts[0]); host != "" {
			return stripBrackets(host)
		}
	}
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		return stripBrackets(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return stripBrackets(r.RemoteAddr)
	}
	return stripBrackets(host)
}

func stripBrackets(host string) string {
	return strings.Trim(host, "[]")
}

func peerKey(host string, port int) string {
	return fmt.Sprintf("%s:%d", host, port)
}

func parseHostPort(addr string) (string, int, bool) {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return "", 0, false
	}
	if !strings.Contains(addr, ":") {
		return "", 0, false
	}
	host, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		// host:port without brackets for simple IPv4
		parts := strings.Split(addr, ":")
		if len(parts) != 2 {
			return "", 0, false
		}
		host = parts[0]
		portStr = parts[1]
	}
	port, err := strconv.Atoi(portStr)
	if err != nil || port <= 0 {
		return "", 0, false
	}
	return stripBrackets(host), port, true
}

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ParsePeerList decodes a /peers response as either a JSON string array or
// {"peers": [...]} for backward compatibility.
func ParsePeerList(data []byte) ([]string, error) {
	var addrs []string
	if err := json.Unmarshal(data, &addrs); err == nil {
		return addrs, nil
	}
	var wrapped struct {
		Peers []string `json:"peers"`
	}
	if err := json.Unmarshal(data, &wrapped); err != nil {
		return nil, err
	}
	return wrapped.Peers, nil
}
