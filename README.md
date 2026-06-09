# Artisan

Artisan is a task board for learning communities. Organizers create tasks, learners submit proof of work, and the platform autonomously manages AI-supported reviews and reward payouts using delegated on-chain permissions.

## Key Concepts & Technologies

Artisan integrates several cutting-edge protocols to create a seamless, gasless experience for community managers:

### 1. **x402 (Payment Required Protocol)**
Artisan implements the **x402 protocol** to gate premium services like AI reviews. When an organizer requests an AI score, the API returns a `402 Payment Required` status. The platform then uses delegated permissions to settle this fee autonomously, providing a "pay-as-you-go" infrastructure for AI-agentic workflows.

### 2. **ERC-7715 (Advanced Permissions)**
Using the **MetaMask Smart Accounts Kit**, Artisan requests **Advanced Permissions** from the organizer. This creates a digital "Power of Attorney" (delegation), allowing the platform to act as an agent. Once granted, Artisan can execute specific transactions (like AI fees and bounty payouts) without requiring the user to manually sign every time.

### 3. **ERC-7710 (Delegated Execution)**
This standard allows a relayer to execute instructions on behalf of a user based on a signed permission. In Artisan, all payouts are formatted as **7710 bundles**, ensuring that the user's intent is carried out securely by a third-party executor.

### 4. **1Shot API & Gas Abstraction**
Artisan uses the **1Shot Permissionless Relayer** to eliminate the need for native gas tokens (ETH).
*   **Gas Abstraction:** Instead of paying gas in ETH, the organizer pays the relayer a small fee in **USDC**.
*   **Redeem Delegations:** 1Shot "redeems" the user's delegated permissions on-chain, paying the ETH gas fee itself and claiming the user's USDC fee in return. This makes the entire application feel like a standard Web2 app where only a single stablecoin is used.

---

## MVP Flow

```txt
Create bounty
-> Learner submits work
-> Organizer starts AI review
   - API returns x402 "Payment Required"
-> Artisan uses Advanced Permission (ERC-7715) to authorize fee
-> 1Shot relays the ERC-7710 fee payment
-> AI scores and summarizes the submission
-> Admin approves the payout
-> Artisan Platform autonomously executes the USDC transfer
-> 1Shot "Redeems" the delegation to settle the transaction gaslessly
-> Bounty stores the final transaction hash
```

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What You Need To Set Up

- **MetaMask Flask 13.5.0+**: Required for Advanced Permissions.
- **Base Sepolia**: The primary 1Shot-compatible test network.
- **Base USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Import this into MetaMask).
- **OpenAI API Key**: For structured AI reviews.
- **1Shot Relayer RPC**: Pointing to the 1Shot Base Sepolia endpoint.

## How Payments Work

Artisan uses a combination of delegative standards to automate complex workflows:

- **MetaMask Advanced Permissions**: The admin grants a capped USDC allowance to the 1Shot relayer. The app stores the permission context locally, allowing it to "hire" AI agents and pay learners autonomously.
- **x402 review payment**: The `/api/openai/review` endpoint is protected by a 402 gate. The client pays the fee via 1Shot, receives a proof, and retries the request.
- **ERC-7710 execution**: The app decodes MetaMask's permission context into a format the 1Shot relayer understands, enabling the relayer to submit transaction bundles to the network on the user's behalf.
- **Relay Status**: Artisan polls the 1Shot task status until the transaction is confirmed on-chain, at which point the final hash is saved to the bounty record.

## Sponsor & Technical Docs

- **MetaMask Smart Accounts Kit**: [Advanced Permissions Guide](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)
- **1Shot API**: [Gas Sponsorship & ERC-7710](https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710)
- **x402 Protocol**: [Agentic Payment Standards](https://x402.org)
- **OpenAI Responses API**: [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
