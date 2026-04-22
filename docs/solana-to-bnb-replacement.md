# Deadhand Solana to BNB / Four.Meme Replacement Analysis

This note captures the required adaptation from the original Solana-oriented execution plan into Deadhand's BNB Chain / Four.Meme implementation.

## Replacement Matrix

| Original Solana assumption | BNB / Four.Meme replacement | Type | Architectural consequence |
| --- | --- | --- | --- |
| Phantom wallet connect and message signing | EVM wallet auth via challenge + EIP-191 `personal_sign` / SIWE-style verification | Adapted | Auth verifies EVM address ownership, not Solana ed25519 signatures |
| Solana public key validation | EVM checksum or lowercase address validation | Exact | All wallet, target, and allowlist checks become address-based |
| SOL / lamports accounting | BNB / wei accounting with human-readable BNB display helpers | Exact | Policy thresholds and execution estimates use wei internally |
| Helius RPC and `simulateTransaction` | BNB JSON-RPC with `eth_call`, `estimateGas`, and preflight execution checks | Adapted | Simulation becomes transaction request validation rather than Solana instruction simulation |
| Jupiter / Raydium routing | Four.Meme launch-stage adapter plus PancakeSwap router adapter post-launch | Adapted | Need separate adapter layer for launch-stage and DEX-stage actions |
| Solana program allowlist/blocklist | Contract/router/target allowlist/blocklist | Adapted | Policy engine evaluates destination contract addresses and action targets |
| SPL token interactions | BEP-20 / ERC-20 transfers and approvals | Exact | Token validation uses EVM token contracts |
| Solana Explorer links | BscScan links | Exact | Execution records store BscScan URL metadata |
| `signTransaction` flow in Phantom | Wallet signs prepared EVM transaction request or raw transaction | Adapted | Backend prepares transaction data but never signs for the user |
| Raydium liquidity seeding | Four.Meme launch/buy flows and PancakeSwap liquidity-aware follow-up actions | Adapted | MVP action set shifts from Solana LP-centric flows to BNB launch-operation semantics |
| Program IDs hardcoded in planner context | Contract addresses and adapter IDs hardcoded in planner context | Exact | Planner output must validate against configured contract allowlists |
| Solana devnet execution demo | BNB testnet or controlled BNB mainnet-compatible demo path | Adapted | Final environment is config-driven; code remains chain-id aware |

## Product intent preserved

- Deadhand stays non-custodial.
- The deterministic policy engine remains the trust boundary.
- The AI layer remains advisory and schema-validated.
- Execution guard still re-checks policy and preflight state before broadcast.
- Audit logging remains first-class.

## Current implementation assumptions

- The backend targets BNB Chain semantics generically.
- Four.Meme-specific uncertainty is isolated behind an adapter interface.
- Router and contract addresses remain config-driven.
- Mock adapters are provided so the system can be built and tested without chain secrets.
