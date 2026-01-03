import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCr07LO6WdHuRPNycUfDvHzAICNqZ6FHNQ"; 
const genAI = new GoogleGenerativeAI(apiKey);

async function testOldSDK() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Testing gemini-pro with @google/generative-ai...");
    
    const result = await model.generateContent("Hello, are you there?");
    console.log("Response:", result.response.text());
    console.log("SUCCESS: Old SDK works!");
    
  } catch (error) {
    console.error("FAILED with Old SDK:", error.message);
    if (error.response) {
        console.error("Error details:", JSON.stringify(error.response, null, 2));
    }
  }
}

testOldSDK();
