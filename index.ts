import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

// ONE main function
async function main() {
  const result = await callGroq(`
    Write a Playwright TypeScript test for saucedemo.com login page.
    Output ONLY TypeScript code, no explanations, no markdown fences.
  `);
  
  console.log(result);
  
  // Save to file automatically
  fs.writeFileSync('generated-test.spec.ts', result);
  console.log("✅ Test saved to generated-test.spec.ts");
}

main();