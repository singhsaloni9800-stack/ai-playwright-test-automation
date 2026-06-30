import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import { chromium } from 'playwright';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Step 1 — Extract real DOM from page
async function getPageSnapshot(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  // New way — get all interactive elements
  const snapshot = await page.evaluate(() => {
    const elements: any[] = [];
    
    // Get all inputs, buttons, links
    document.querySelectorAll('input, button, a, select, textarea').forEach(el => {
      elements.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        name: el.getAttribute('name') || null,
        type: el.getAttribute('type') || null,
        placeholder: el.getAttribute('placeholder') || null,
        text: el.textContent?.trim() || null,
        dataTest: el.getAttribute('data-test') || null
      });
    });
    
    return elements;
  });
  
  await browser.close();
  
  return JSON.stringify(snapshot, null, 2);
}

// Step 2 — Send to AI with real DOM context
async function callGroq(prompt: string): Promise<string> {
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
          content: "You are a Playwright TypeScript expert. Output ONLY raw TypeScript code. No explanations. No markdown fences. No backticks. Start directly with imports."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

// Step 3 — Main function combining both
async function generateTests(url: string) {
  console.log(`🔍 Scanning page: ${url}`);
  
  // Get real DOM
  const snapshot = await getPageSnapshot(url);
  console.log("✅ Page scanned successfully");
  
  // Build prompt with real DOM
  const prompt = `
Here are the real elements found on ${url}:
${snapshot}

Using ONLY these real elements and their selectors, write a complete Playwright TypeScript test that:
1. Tests successful login with standard_user / secret_sauce
2. Tests failed login with wrong credentials
3. Verifies error message appears
Important rules:
- Never use .textContent() inside expect()
- Always use .toContainText() or .toHaveText() directly on locator
- Correct: expect(page.locator('selector')).toContainText('text')
- Wrong: expect(page.locator('selector').textContent()).toContain('text')
Important selector rules:
- data-test attributes MUST have square brackets: [data-test="value"]
- Never write: data-test="value"
- Always write: [data-test="value"]
- After successful login verify URL contains /inventory.html
- Use: await expect(page).toHaveURL(/inventory.html/)

Output ONLY TypeScript code. Start with imports.
  `;
  
  console.log("🤖 Generating tests with AI...");
  const result = await callGroq(prompt);
  
  // Save to file
  fs.writeFileSync('smart-generated.spec.ts', result);
  console.log("✅ Tests saved to smart-generated.spec.ts");
  console.log("\nGenerated code:");
  console.log(result);
}

// Run it
generateTests("https://www.saucedemo.com");