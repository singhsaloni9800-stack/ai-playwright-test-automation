import * as dotenv from 'dotenv';
dotenv.config();
import { chromium, Page } from 'playwright';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ---------- SEE ----------
async function getPageDOM(page: Page): Promise<string> {
  const elements = await page.evaluate(() => {
    const els: any[] = [];
    document.querySelectorAll('input, button, a').forEach(el => {
      els.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        dataTest: el.getAttribute('data-test') || null,
        text: el.textContent?.trim() || null
      });
    });
    return els;
  });
  return JSON.stringify(elements, null, 2);
}

// ---------- THINK ----------
type AgentAction = {
  action: "click" | "fill" | "done";
  selector?: string;
  value?: string;
  reasoning: string;
};

async function decideNextAction(
  goal: string,
  currentDOM: string,
  history: string[]
): Promise<AgentAction> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a browser automation agent. Given a goal and the current page elements, decide the SINGLE next action to take.

Respond ONLY with valid JSON in this exact format, nothing else:
{"action": "click" | "fill" | "done", "selector": "css selector if needed", "value": "text to fill if action is fill", "reasoning": "short reason"}

Use "done" when the goal is achieved.`
        },
        {
          role: "user",
          content: `
Goal: ${goal}

Actions already taken: ${JSON.stringify(history)}

Current page elements:
${currentDOM}

What is the next single action?
          `
        }
      ]
    })
  });

  const data = await response.json() as any;
  const text = data.choices[0].message.content.trim();
  return JSON.parse(text) as AgentAction;
}

// ---------- ACT ----------
async function executeAction(page: Page, action: AgentAction): Promise<void> {
  if (action.action === "click" && action.selector) {
    await page.click(action.selector);
  } else if (action.action === "fill" && action.selector && action.value) {
    await page.fill(action.selector, action.value);
  }
}

// ---------- THE LOOP ----------
async function runAgent(url: string, goal: string) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url);

  const history: string[] = [];
  const MAX_STEPS = 10; // safety limit so it can't loop forever

  for (let step = 1; step <= MAX_STEPS; step++) {
    console.log(`\n--- Step ${step} ---`);

    const currentDOM = await getPageDOM(page);
    const decision = await decideNextAction(goal, currentDOM, history);

    console.log(`🤖 Decision: ${decision.action} | ${decision.reasoning}`);

    if (decision.action === "done") {
      console.log("✅ Goal achieved!");
      break;
    }

    await executeAction(page, decision);
    history.push(`${decision.action} ${decision.selector ?? ""} ${decision.value ?? ""}`);

    await page.waitForTimeout(1000); // small pause so page settles
  }

  await browser.close();
}

// ---------- RUN ----------
runAgent(
  "https://www.saucedemo.com",
  "Log in with username standard_user and password secret_sauce, then verify you reach the products page"
);