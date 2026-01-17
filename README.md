# 🛡️ turbo broccoli

**Pre-Deployment Security Guardrail for Developers**

> "If I were an attacker, how would I break this app?"  
> turbo broccoli tells you the answer before you ship.


## 📌 Problem

Students and early-stage startups often ship fast and break rules. Common mistakes include:
- Committing `.env` files or API keys.
- Misconfiguring JWTs (using `none` alg or weak secrets).
- Leaving CORS wide open (`*`).
- Exposing admin routes without protection.

turbo broccoli acts as a **last-mile security checkpoint** that catches these issues, explains how to exploit them, and offers one-click fixes.

## 🚀 Features

-   **🔍 Deep Repository Scan**: Analyzes source code for 5+ critical vulnerability patterns.
-   **😈 Exploit Simulation**: Demonstrates *impact* by forging tokens (JWT) and testing access controls.
-   **🤖 Auto-Fix PRs**: One-click generation of Pull Requests to patch vulnerabilities (Simulated in MVP).
-   **📊 Premium Dashboard**: A developer-friendly UI to view risks and mitigation steps.

## 🛠️ Tech Stack

-   **Frontend**: Next.js 14, TailwindCSS 4, Lucide Icons
-   **Backend Logic**: Node.js, `glob`, Regex, AST-like parsing
-   **Simulation**: `jsonwebtoken`, `axios` for exploit scripts

## ⚡ Getting Started

### 1. Installation

```bash
git clone https://github.com/vedant44-cyber/turbo-broccoli.git
cd turbo-broccoli
npm install
```

### 2. Configuration

Copy the example env file (or use the one provided):

```bash
cp .env.example .env
```


### 3. Run the Dashboard

```bash
npm run dev
# Open http://localhost:3000
```


## 🧪 How to Verify (Demo Flow)

1.  **Open Dashboard**: Go to `http://localhost:3000`.
2.  **Scan**: Click **"Run Scan"**.
3.  **View Results**: You should see 12+ vulnerabilities found in `src/vulnerable_app_test.ts`.
4.  **Check Details**: Expand the "AWS Access Key" card.



