Hyperliquid Integration Roadmap (Non-Custodial DEX)
Phase 0 – Research & Foundations (1 week)

Deep-dive into official docs & SDKs
Study: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
Key sections: Signing spec, Nonces (per-signer), Exchange/Info endpoints, WebSocket (POST subscriptions), Rate limits, Exact JSON serialization rules, Testnet vs Mainnet URLs
Test official Python/TS SDKs and top community ones (nktkas/hyperliquid, nomeida/hyperliquid)
Confirm testnet is fully functional: https://api.hyperliquid-testnet.xyz + app.hyperliquid-testnet.xyz

Lock non-custodial policy (mandatory)
HL private keys/seeds never touch servers
All signing happens in-browser with user-controlled keys
Document & enforce in code reviews + CI

Define MVP scope & SLAs
Initial markets: BTC-PERP, ETH-PERP, major alts
Target latency: <300ms order submit → HL acceptance
Concurrency: 100–500 active traders at launch

Security & compliance kickoff
Threat model focus: replay attacks, nonce loss, serialization bugs, auth bypass
Choose KMS/HSM only for any operational relayer keys (not user keys)


Phase 1 – Architecture & Core Contracts (2–4 days)

Final architecture
Frontend (React/TS) → API Gateway → Auth/Order Service → Relayer → Hyperliquid
Market Data Service + Ledger (Postgres) + Analytics (ClickHouse) + Message bus (Kafka/NATS/Redis Streams)

Message bus topics & idempotency
orders.created, orders.updated, fills, ledger.entries, etc.
Every message: correlation_id, causation_id, idempotency_key

Canonical JSON serializer (critical!)
Build & heavily test a serializer that produces byte-for-byte identical payloads to what HL expects (no trailing zeros, exact field order, stringified numbers, etc.)
Write 100+ golden tests against real HL examples


Phase 2 – Frontend: Wallet & Hyperliquid Key Management (1.5–2 sprints)
Goal: Users connect EVM wallet → create/import HL trading key locally → all signing in browser.

EVM wallet connection (MetaMask, WalletConnect, etc.) + SIWE authentication
Hyperliquid key UX
Generate new Ed25519 keypair in browser OR import existing seed/phrase
Require user-provided passphrase → encrypt private key with AES-GCM → store in IndexedDB
Explicit backup/export flow + scary warnings
“Lock wallet” / passphrase re-entry on sensitive actions

Signing flow
Use official or battle-tested TS utils for HL-style signing
Always show clear sign dialog: “Placing 0.5 BTC-PERP Long @ $68,420 limit”


Phase 3 – Backend Auth & Session (4–6 days)
Goal: Prove user controls an HL public key without ever seeing the private key.

Auth endpoint
User signs a server-provided challenge/nonce with their HL private key
Backend verifies signature → issues short-lived JWT (10–15 min) scoped only to order routing

Nonce & replay protection for auth
Track used auth nonces per pubkey (Redis + Postgres audit)

Session → pubkey → user_id mapping (Redis hot path)

Phase 4 – Market Data & User Feeds (2–3 sprints)

Connect to HL WebSocket (mainnet & testnet)
Subscribe to L2 book, trades, user orders/fills/positions (signed subscriptions)
Handle WS POST requests for auth

Fan-out internally
Republish to internal bus + Redis cache (top-of-book, last price, user positions)

Connection resilience
Pooling, exponential backoff, auto-reconnect with full state resub


Phase 5 – Order Submission Path (2 sprints)

Frontend
Build order ticket → construct HL payload → user signs in browser → POST signed payload + sig + JWT to your /orders endpoint

Order Service (backend)
Validate JWT + HL signature
Business-rule checks (size/price ticks from HL meta, leverage caps, user risk limits)
Re-serialize payload with canonical serializer (defense in depth)
Insert pending order record → publish orders.created

Relayer
Consume orders.created → POST to https://api.hyperliquid.xyz/exchange (or WS)
Per-signer nonce management (durable Redis/Postgres – critical to never reuse/lose nonces)
Global & per-user rate limiting + circuit breaker
Idempotency via your idempotency_key + HL order response tracking
Retry transient failures, queue on rate limits

Real-time feedback
Push orders.updated / fills via your own WS to frontend


Phase 6 – Ledger, Reconciliation & Analytics (1–2 sprints)

Immutable ledger in Postgres
Append-only entries for fills, deposits/withdrawals

Reconciler
Continuously compare HL user state (positions, margin, PnL) vs your ledger
Divergence alerts

Analytics
Stream fills → ClickHouse for PnL dashboards (mirror HL’s authoritative PnL)


Phase 7 – Operational Hardening (ongoing, start early)

Enforce “no private key on server” everywhere (CI lint + reviews)
Rate-limit monitoring dashboard (approaching HL global limits → alert)
Comprehensive logging + correlation IDs → SIEM
Daily transfer/withdrawal caps (if you ever add bridging)

Phase 8 – Testing Matrix (run continuously, gate production)

Unit: signing, serialization, nonce logic
Integration: full flow on Hyperliquid testnet (mandatory – testnet is excellent)
Chaos: WS disconnects, rate-limit simulation, nonce gaps
Load: 1000+ orders/min bursts
Security review / light pentest on auth & order endpoints

Phase 9 – Monitoring & Incident Response (build before launch)

Dashboards: HL connection health, relayer queue depth, rejection rates, reconciliation diff
Critical alerts + runbooks (e.g., “HL WS down → switch to read-only mode”)

Recommended Launch Order

Get basic market data + read-only balances working (no trading)
Add testnet trading with a few internal users
Dogfood on mainnet with tiny sizes
Gradual public rollout