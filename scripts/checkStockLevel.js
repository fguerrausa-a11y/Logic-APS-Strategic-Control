
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkStock() {
    console.log("Checking stock for RM-STEEL-SHEET...");

    // Try to find the item by ID or Name
    const { data: items, error } = await supabase
        .from('items')
        .select('id, name, initial_stock') // Check both cols just in case
        .or('id.eq.RM-STEEL-SHEET,name.ilike.%Chapa%');

    if (error) {
        console.error(error);
        return;
    }

    console.log("Found items:", items);
}

checkStock();
