# Privacy Vaults
 ***Would you share how much you borrowed from a bank?***

 ***What if you could borrow money... without anyone knowing you exist?***
#

Deposit privately, earn yield, borrow against your ZK proof, and withdraw to any chain — all without a single wallet popup. The longer your funds stay in the vault, the more you earn and the more private you become.

Currently live on:
- [Privacy Vaults](https://privacyvaults.arnaubriet.com)

## What is Privacy Vaults

Privacy Vaults is a DeFi protocol that lets users deposit USDC into a shared vault, earn yield from Aave V3 and Morpho, and withdraw privately using zero-knowledge proofs. Deposits break the on-chain link between depositor and withdrawer — nobody can tell which deposit a withdrawal corresponds to. The longer funds stay in the vault, the more yield they accumulate and the larger the anonymity set grows, so privacy and profit increase together.

Users can also use their ZK proof as collateral to borrow directly from the vault — accessing liquidity without withdrawing and without giving up privacy or yield. The entire experience is gasless thanks to Pimlico-sponsored EIP-7702 transactions, and users can withdraw to any chain or token via LI.FI bridging.

## Key Features

- **Embedded wallet (Openfort)** — Email, social, or passkey login with automatic key recovery. No extensions, no popups, no seed phrases.
- **Privacy via ZK proofs** — Noir circuits with Barretenberg proving system. Withdrawal proofs reveal nothing about the original deposit.
- **Yield-earning deposits** — Funds are split 50/50 between Aave V3 and Morpho, earning yield while sitting in the vault. The longer you wait, the more you earn and the more anonymous you become.
- **ZK proof as collateral** — Use your zk proof of deposit as a collateral to borrow up to 70% LTV directly from the vault, without withdrawing. Your deposit keeps earning yield while you access liquidity.
- **Gasless UX** — All transactions (deposit, withdraw, borrow, repay, bridge) are gas-sponsored via Pimlico using EIP-7702 delegation. Users never need ETH.
- **Cross-chain withdrawals (LI.FI)** — Withdraw to any supported chain and token. LI.FI handles bridge routing and liquidity aggregation automatically.
- **ENS integration** — Resolve ENS names as withdrawal or borrow recipients. ENS text records let users set default withdrawal preferences.

## How It Works

### 1. Deposit

User deposits a fixed amount of USDC via EIP-3009 `receiveWithAuthorization` (gasless). The contract computes a Poseidon2 commitment on-chain and inserts it into a depth-20 Merkle tree. The user receives a secret note that encodes their commitment, nullifier, secret, and yield index.

### 2. Earn Yield

Deposited funds are split 50/50 between Aave V3 and a Morpho. A blended yield index (averaged and bucketed to 1e23 precision) tracks earnings while preserving the depositor's anonymity set. The longer a user waits between deposit and withdrawal, the more yield they accumulate and the more anonymous they become, since more deposits will have entered the same yield bucket over time. Privacy and profit grow together.

### 3. Borrow

Users can use their ZK proof as collateral to borrow directly from the vault — up to 70% of their deposit's yield-adjusted value — without ever withdrawing. The user generates a proof that they own a valid commitment in the Merkle tree, and the vault lends against it. The borrow circuit only reveals a collateral nullifier, so borrowing doesn't compromise withdrawal privacy. This means users can access liquidity while their deposit keeps earning yield and growing its anonymity set.

### 4. Withdraw

Users generate a ZK proof from their secret note and submit it to the contract. The proof verifies Merkle tree membership and nullifier validity without revealing which leaf was used. The user receives their deposit plus accrued yield, minus a small fee. Cross-chain withdrawals are handled automatically via LI.FI.

## LI.FI Integration

LI.FI enables cross-chain withdrawals so users aren't restricted to receiving USDC on Base.

**How it works:**

- After a vault withdrawal, the frontend fetches a LI.FI quote for the user's desired destination chain and token
- The bridge transaction (USDC approval + LI.FI call) is bundled into a single gasless transaction via Pimlico
- The frontend polls the LI.FI status API until the bridge completes
- Supported destination chains: Base, Ethereum, Arbitrum, Optimism, Polygon and more. 

**What it enables:**

- Withdraw to any chain in any token with one click
- No manual bridging or token swapping required
- Combined with gasless transactions, the entire flow from vault withdrawal to cross-chain delivery requires zero gas from the user

## ENS Integration

ENS is used in two ways: recipient resolution and withdrawal preferences.

**Recipient resolution** — Users can enter an ENS name (e.g. `alice.eth`) as the withdrawal recipient instead of a raw address. The frontend resolves it via mainnet ENS and displays the associated avatar.

**Withdrawal preferences** — Users can set ENS text records to configure default withdrawal settings:

- `privacy-vault.chain` — Preferred destination chain ID (e.g. `10` for Optimism)
- `privacy-vault.token` — Preferred token symbol (e.g. `USDC`)

When a recipient has these records set, the UI auto-selects their preferred chain and token. This creates a set-once, withdraw-anywhere experience — a sender only needs the recipient's ENS name, and funds arrive on the recipient's preferred chain in their preferred token.

## Architecture

```
circuits/            Noir ZK circuit for withdrawals 
circuits_borrow/     Noir ZK circuit for borrowing 
contracts/           Solidity smart contracts (Foundry)
backend/             Express API server
frontend/            React single-page application
```

**Circuits** — Two Noir circuits (withdraw + borrow) compiled to UltraHonk via Barretenberg. Depth-20 Merkle tree supports ~1M deposits. Poseidon2 hash function for commitments and nullifiers.

**Contracts** — Solidity 0.8.24 with Foundry. Core contract (`PrivacyVault.sol`) manages deposits, withdrawals, borrows, repayments, and yield allocation. Uses OpenZeppelin for token interfaces, Aave V3 for lending, and Morpho for vault yield.

**Backend** — Express 5 + TypeScript server. Reads on-chain state (commitments, yield indices, loan info) via viem. Handles Openfort Shield sessions for key recovery and a testnet USDC faucet.

**Frontend** — React 18 + Vite + TypeScript. ZK proofs are generated in-browser using Noir JS and Barretenberg WASM. Wallet connection via wagmi + Openfort. 3D visualizations with Three.js. Gasless transactions via Pimlico.

## Project Structure

```
Privacy-Vaults/
├── circuits/
│   └── src/
│       ├── main.nr                  # Withdrawal circuit
│       └── merkle_tree.nr           # Merkle proof verification
├── circuits_borrow/
│   └── src/
│       ├── main.nr                  # Borrow circuit
│       └── merkle_tree.nr
├── contracts/
│   ├── src/
│   │   ├── PrivacyVault.sol         # Core vault contract
│   │   ├── Verifier.sol             # Withdrawal proof verifier
│   │   ├── BorrowVerifier.sol       # Borrow proof verifier
│   │   └── IncrementalMerkleTree.sol
│   ├── script/                      # Foundry deploy scripts
│   └── test/
├── backend/
│   └── src/
│       ├── server.ts                # Express server + rate limiting
│       ├── routes.ts                # API endpoints
│       ├── vault.ts                 # Contract read helpers
│       └── config.ts                # Environment config
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   └── VaultPage.tsx
│       ├── components/
│       │   ├── DepositTab.tsx
│       │   ├── WithdrawTab.tsx
│       │   ├── BorrowTab.tsx
│       │   └── CrossChainSelector.tsx
│       ├── hooks/
│       │   ├── useDeposit.ts
│       │   ├── useWithdraw.ts
│       │   ├── useBorrow.ts
│       │   ├── useRepay.ts
│       │   ├── useSponsoredTransaction.ts
│       │   ├── lifi/               # LI.FI bridging hooks
│       │   └── ens/                # ENS resolution hooks
│       └── zk/                     # Proof generation + note encoding
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18

> Circuit artifacts and contract deployments are already included in the repository. Nargo and Foundry are only needed if you want to modify the circuits or contracts.

### Environment Variables

Both the backend and frontend require environment variables for Openfort, Pimlico, and other services. Copy the `.env.example` files and fill in the values. For a detailed guide on obtaining and configuring all required keys (Openfort publishable key, Shield key, policy ID, encrypted session endpoint, etc.), see the [Openfort EIP-7702 environment configuration guide](https://www.openfort.io/docs/recipes/7702#environment-configuration).

### Run Backend

```bash
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev
```

### Run Frontend

```bash
cd frontend
cp .env.example .env   # fill in values
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Wallet | wagmi, Openfort |
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| ZK Circuits | Noir, Barretenberg (UltraHonk), Poseidon2 |
| Backend | Express 5, TypeScript, viem |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| DeFi Protocols | Aave V3, Morpho (ERC-4626) |
| Gasless Transactions | Pimlico (EIP-7702), EIP-3009 |
| Cross-Chain | LI.FI |
| Identity | ENS |
| 3D Graphics | Three.js, React Three Fiber |

## Disclaimer

This project is a proof of concept built for educational and demonstration purposes only. It has **not been audited** and should **not be used with real funds**. The smart contracts, ZK circuits, and infrastructure may contain bugs, vulnerabilities, or other issues that could result in loss of funds. Use at your own risk.

This software is provided "as is", without warranty of any kind. The authors are not responsible for any losses or damages arising from its use.
