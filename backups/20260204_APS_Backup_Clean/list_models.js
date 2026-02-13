
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
} catch (e) {
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log("Listing available models...");
    try {
        // There isn't a direct listModels method on the main simple SDK wrapper exposed as easily, 
        // but we can try to fetch it via REST if the SDK doesn't expose it handy or just try known ones.
        // Actually the SDK doesn't cleanly expose listModels in the high level 'genAI' object in all versions.
        // Let's use fetch for this one to be sure.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Found models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models found or error structure:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("List models failed:", error);
    }
}

listModels();
