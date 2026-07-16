# Scope: Milestone 2 (R2: Centralized HTTP Bootstrap & DNS Seeders)

## Architecture
- **DNS Seeders**: Enhance the lookup mechanism in `p2pserver/protocols/bootstrap/bootstrap.go` to query DNS seed hostnames (which can return multiple IPs) and connect to all resolved peer IPs rather than just the first one.
- **HTTP Bootstrap Registry**:
  - Implement an HTTP bootstrap client inside the P2P server. When starting, it registers its own peer address (e.g. `IP:Port`) to a centralized HTTP registry server if configured.
  - The client queries the HTTP registry server to obtain active peer addresses and initiates outbound connections to them to seed the local node's routing/neighbor tables.
  - Implement a mock HTTP service for automated verification of registration and querying behaviors.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Config & DNS Seeders Upgrade | Add configuration fields for HTTP registry & DNS seeders. Modify host lookup in `bootstrap.go` to collect all resolved IPs from DNS seeders. | none | PLANNED |
| 2 | HTTP Bootstrap Client | Implement HTTP registration client and HTTP peer list query client within `bootstrap.go`. | M1 | PLANNED |
| 3 | Mock HTTP Bootstrap Service & Tests | Add a mock HTTP server and verification tests in `p2pserver/protocols/bootstrap/bootstrap_test.go` or `mock/discovery_test.go`. | M2 | PLANNED |

## Interface Contracts
### Config Integration
- Configuration parameters in `P2PNodeConfig` (or read from command line / config file):
  - `HttpBootstrapAddr` (string) - URL of the centralized HTTP bootstrap registry server (e.g. `http://localhost:8080`).
  - `DnsSeeds` ([]string) - list of DNS seeds to query (domain name or domain:port).

### HTTP Registry API
- Node Registration: `POST /register?addr=<ip:port>` or body containing node endpoint.
- Node Retrieval: `GET /nodes` or similar endpoint returning JSON array of active peer endpoints (e.g., `["127.0.0.1:20338", "127.0.0.1:20438"]`).
