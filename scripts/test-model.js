import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyCr07LO6WdHuRPNycUfDvHzAICNqZ6FHNQ"; 
const ai = new GoogleGenAI({ apiKey });

const candidates = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro"
];

async function testModels() {
  for (const model of candidates) {
    try {
      console.log(`Testing model: ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: "Hello",
      });
      console.log(`SUCCESS: ${model} works!`);
      // console.log(response.text);
      return; // Stop after first success
    } catch (error) {
      console.log(`FAILED: ${model} - ${error.message.split('\n')[0]}`);
    }
  }
  console.log("All candidates failed.");
}

testModels();
