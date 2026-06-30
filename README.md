# AI-Powered Playwright Test Automation

An experimental framework that combines **Playwright** with an **LLM API (Groq/Llama 3)** to automate three of the most time-consuming parts of test automation: writing tests, fixing broken selectors, and exploring an application without a predefined script.

## The Problem

Traditional test automation has three recurring pain points:
- Writing test cases for every new feature takes hours, even for simple flows
- A single UI change (an id or class renamed) breaks selectors and silently fails CI pipelines until someone manually investigates
- Exploring a new flow for edge cases still requires a human to click through it first

This project explores how an LLM, given real-time access to a page's structure, can take on each of these tasks.

## What's Inside

### 1. AI Test Generator (`smart-generator.ts`)
Give it a URL. It opens the page with Playwright, extracts the real interactive elements (inputs, buttons, links, `data-test` attributes), and sends that structure to an LLM with instructions to write a Playwright TypeScript test suite — using only the real selectors it found, not guessed ones.

```
URL → Playwright reads real DOM → LLM writes test code → saved as .spec.ts → npx playwright test
```

### 2. Self-Healing Locators (`self-healing.ts`)
A wrapper around Playwright actions (e.g. `click`) that doesn't fail when a selector breaks. If the original selector can't be found, it re-scans the current page, describes the broken selector and the original intent to the LLM, and retries with the selector the model suggests — without any human intervention.

```
Action fails → re-scan page → describe intent + broken selector to LLM → retry with suggested selector
```

### 3. Autonomous Agent (`agent.ts`)
Instead of scripted steps, you give the agent a single goal in plain English (e.g. *"log in and verify you reach the products page"*). On each loop iteration it reads the current page, asks the LLM for the single next action (click / fill / done) in structured JSON, executes it with Playwright, and repeats until the goal is met.

```
Goal → [see page → LLM decides next action → execute → repeat] → done
```

## Tech Stack
- **Playwright** — browser automation and DOM extraction
- **TypeScript** — typed scripting throughout
- **Groq API (Llama 3.3 70B)** — LLM reasoning and code generation
- **Node.js / ts-node**

## Running Locally

```bash
git clone https://github.com/singhsaloni9800-stack/ai-playwright-test-automation.git
cd ai-playwright-test-automation
npm install
```

Create a `.env` file with your own Groq API key (free at console.groq.com):
```
GROQ_API_KEY=your_key_here
```

Run any of the three:
```bash
ts-node --transpile-only smart-generator.ts   # generates a test file from a URL
ts-node --transpile-only self-healing.ts      # demonstrates a selector healing itself
ts-node --transpile-only agent.ts             # runs the autonomous agent toward a goal
```

## Example Output — Self-Healing in Action

```
❌ Selector broken: #login-button-broken
🔧 Asking AI to fix...
💡 AI suggests: #login-button
✅ Fixed and clicked: #login-button
✅ Login successful!
```

## Example Output — Autonomous Agent

```
--- Step 1 ---
🤖 Decision: fill | need to fill username field
--- Step 2 ---
🤖 Decision: fill | fill password to complete login credentials
--- Step 3 ---
🤖 Decision: click | login button needs to be clicked to submit the form
--- Step 4 ---
🤖 Decision: done | Products page reached after login
✅ Goal achieved!
```

## Notes & Limitations
This is a learning/portfolio project, not a production framework. Known limitations:
- The agent has no memory of failed attempts beyond a simple history log, so it can occasionally repeat a mistaken action
- DOM extraction currently looks at `input`, `button`, and `a` tags only — extending to a full accessibility tree would improve coverage on more complex apps
- No retry/backoff handling on LLM API failures yet

## Why This Matters
Most automation engineers either write tests manually or use AI as a one-off code-completion tool. This project explores giving Playwright and an LLM a tight feedback loop — the LLM gets real, current page data instead of guessing from training data, and Playwright gets a reasoning layer instead of fixed scripts. The same pattern (see → decide → act) underlies all three components here.
