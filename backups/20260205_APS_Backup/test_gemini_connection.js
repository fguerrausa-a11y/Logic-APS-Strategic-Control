
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Read .env.local manually since we are in a standalone script
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("Could not read .env.local", e);
    process.exit(1);
}

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

console.log(`Testing Gemini with Key: ${apiKey.substring(0, 8)}...`);

async function testModel(modelName) {
    console.log(`\nTesting model: ${modelName}`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log(`SUCCESS: ${modelName} responded: ${response.text().substring(0, 50)}...`);
        return true;
    } catch (error) {
        console.error(`FAILURE: ${modelName} - ${error.message}`);
        if (error.response) {
            console.error("Error details:", JSON.stringify(error.response, null, 2));
        }
        return false;
    }
}

async function runTests() {
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "models/gemini-1.5-flash"];
    let success = false;

    for (const m of models) {
        if (await testModel(m)) {
            success = true;
            break;
        }
    }

    if (!success) {
        console.error("\nALL MODELS FAILED.");
        process.exit(1);
    }
}

runTests();
