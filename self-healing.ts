import * as dotenv from 'dotenv';
dotenv.config();
import { chromium, Page } from 'playwright';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Get current page DOM
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

// Ask AI to fix broken selector
async function healSelector(
  brokenSelector: string, 
  intent: string, 
  currentDOM: string
): Promise<string> {
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
          content: "You are a Playwright expert. Return ONLY a single selector string. No explanation. No code. Just the selector."
        },
        {
          role: "user",
          content: `
Broken selector: "${brokenSelector}"
Intent: "${intent}"
Current page elements: ${currentDOM}

What is the correct selector? Return ONLY the selector string.
          `
        }
      ]
    })
  });

  const data = await response.json() as any;
  return data.choices[0].message.content.trim();
}

// Self healing click
async function healingClick(
  page: Page, 
  selector: string, 
  intent: string
): Promise<void> {
  try {
    await page.click(selector, { timeout: 3000 });
    console.log(`✅ Clicked: ${selector}`);
  } catch (error) {
    console.log(`❌ Selector broken: ${selector}`);
    console.log(`🔧 Asking AI to fix...`);
    
    const currentDOM = await getPageDOM(page);
    const newSelector = await healSelector(selector, intent, currentDOM);
    
    console.log(`💡 AI suggests: ${newSelector}`);
    await page.click(newSelector);
    console.log(`✅ Fixed and clicked: ${newSelector}`);
  }
}

// Test it
async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.saucedemo.com');
  
  // Fill login form
  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  
  // This will work fine
// Change correct selector to a BROKEN one
await healingClick(page, '#login-button-broken', 'login submit button');  
  console.log('✅ Login successful!');
  await browser.close();
}

main();