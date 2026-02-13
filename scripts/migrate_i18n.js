import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual .env.local parsing
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const i18nDir = path.join(__dirname, '..', 'services', 'i18n');
const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.ts') && f !== 'types.ts');

async function migrate() {
    const allTranslations = [];

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(path.join(i18nDir, file), 'utf8');

        // Pattern: 'key': { es: '...', en: '...', ... }
        const regex = /'([^']+)':\s*\{([^}]+)\}/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            const langDataRaw = match[2];

            const langData = {};
            const langRegex = /(\w+):\s*'([^']*)'/g;
            let langMatch;
            while ((langMatch = langRegex.exec(langDataRaw)) !== null) {
                langData[langMatch[1]] = langMatch[2];
            }

            allTranslations.push({
                key,
                ...langData
            });
        }
    }

    console.log(`Extracted ${allTranslations.length} keys. Starting upload...`);

    const chunkSize = 50;
    for (let i = 0; i < allTranslations.length; i += chunkSize) {
        const chunk = allTranslations.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('app_translations')
            .upsert(chunk, { onConflict: 'key' });

        if (error) {
            console.error(`Error uploading chunk ${i}-${i + chunkSize}:`, error);
        } else {
            console.log(`Uploaded chunk ${i}-${i + chunkSize}`);
        }
    }

    console.log('Migration complete!');
}

migrate();
