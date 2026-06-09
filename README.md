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

##  Feedback


### 1. MetaMask Smart Accounts Kit & ERC-7715
The implementation of **Advanced Permissions** is a paradigm shift for Web3 UX. It allowed our platform to transition from a "Wallet-Centric" app to an "Agentic" app, where the software can finally act on the user's behalf without constant interruptions. The security model (scoping permissions to specific assets/amounts) is perfectly balanced. To further enhance this, future SDK versions could include helpers to map 7715 contexts directly to 7710 execution formats and provide more granular spending limit templates in the MetaMask UI (e.g., "Allow up to 5 AI reviews").

### 2. 1Shot API & ERC-7710
1Shot's "Permissionless Relayer" approach is the most seamless way to implement gas abstraction. The `relayer_send7710Transaction` endpoint is highly intuitive. A valuable addition would be a "Fee Lock" or a longer TTL for quoted fees from `relayer_getFeeData` to improve the success rate of complex, multi-step agentic transactions during high network volatility.

### 3. x402 Protocol
The **x402 protocol** is the cleanest way we've found to handle "Agentic Discovery." By returning a 402 status with structured payment metadata, our frontend was able to dynamically handle payments for various services without hardcoding prices. It turns the API into a self-documenting marketplace. We believe the ecosystem would benefit from standardized client-side interceptors that can automatically detect a 402, parse the metadata, and trigger the payment flow.

### 4. Venice AI
The **Inference Speed** and strict adherence to system prompts (especially for JSON output) are outstanding. The `venice-uncensored` model followed our complex review rubric perfectly and never failed to return a valid JSON object, which is critical for autonomous backend processing. Expanding the documentation for `venice_parameters` with more examples for structured data extraction would make it even more accessible for constrained workflows.


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
- **Venice AI API Key**: For structured AI reviews.
- **1Shot Relayer RPC**: Pointing to the 1Shot Base Sepolia endpoint.

## How Payments Work

Artisan uses a combination of delegative standards to automate complex workflows:

- **MetaMask Advanced Permissions**: The admin grants a capped USDC allowance to the 1Shot relayer. The app stores the permission context, allowing it to "hire" AI agents and pay learners autonomously.
- **x402 review payment**: The `/api/venice/review` endpoint is protected by a 402 gate. The client pays the fee via 1Shot, receives a proof, and retries the request.
- **ERC-7710 execution**: The app decodes MetaMask's permission context into a format the 1Shot relayer understands, enabling the relayer to submit transaction bundles to the network on the user's behalf.
- **Relay Status**: Artisan polls the 1Shot task status until the transaction is confirmed on-chain, at which point the final hash is saved to the bounty record.

## Sponsor & Technical Docs

- **MetaMask Smart Accounts Kit**: [Advanced Permissions Guide](https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/)
- **1Shot API**: [Gas Sponsorship & ERC-7710](https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710)
- **x402 Protocol**: [Agentic Payment Standards](https://x402.org)
- **Venice AI**: [Chat Completions API](https://docs.venice.ai/api-reference/endpoint/chat/completions)

---

