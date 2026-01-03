import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const apiKey = "AIzaSyCr07LO6WdHuRPNycUfDvHzAICNqZ6FHNQ"; 
const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    console.log("Fetching models...");
    const response = await ai.models.list();
    
    // In the new SDK, response might be an iterable or have a specific structure
    // Let's inspect it carefully.
    
    let models = [];
    if (Array.isArray(response)) {
        models = response;
    } else if (response.models && Array.isArray(response.models)) {
        models = response.models;
    } else if (typeof response[Symbol.iterator] === 'function') {
        // It might be an iterable
        for (const m of response) {
            models.push(m);
        }
    } else {
        // Try to dump keys
        console.log("Unknown response structure keys:", Object.keys(response));
        if (response.models) {
             console.log("response.models type:", typeof response.models);
        }
    }

    const simpleModels = models.map(m => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods
    }));

    fs.writeFileSync('available_models.json', JSON.stringify(simpleModels, null, 2));
    console.log(`Wrote ${simpleModels.length} models to available_models.json`);

  } catch (error) {
    console.error("Error:", error);
    fs.writeFileSync('available_models_error.txt', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
}

listModels();
