
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking items schema...');
    const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    if (items.length > 0) {
        console.log('Item columns:', Object.keys(items[0]));
    } else {
        console.log('No items found to check schema.');
    }
}

checkSchema();
