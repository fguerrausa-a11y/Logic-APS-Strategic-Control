
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

async function populateBuffers() {
    console.log('Fetching items to populate buffers...');

    // Getitems that are purchased/raw materials
    const { data: items, error } = await supabase
        .from('items')
        .select('id, name')
        .in('item_type', ['COMPRADO', 'MP', 'INSUMO', 'PURCHASED']);

    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    console.log(`Found ${items.length} items to update.`);

    for (const item of items) {
        // Generate random realistic values for a manufacturing context
        const initialStock = Math.floor(Math.random() * 40) + 10; // 10 to 50
        const minQty = Math.floor(Math.random() * 5) + 2; // 2 to 7
        const leadTime = Math.floor(Math.random() * 12) + 3; // 3 to 15 days

        const { data: updateData, error: updateError } = await supabase
            .from('items')
            .update({
                initial_stock: initialStock,
                min_purchase_qty: minQty,
                lead_time_days: leadTime
            })
            .eq('id', item.id)
            .select();

        if (updateError) {
            console.error(`Failed to update ${item.name}:`, updateError);
        } else if (updateData && updateData.length > 0) {
            console.log(`Updated ${item.name}: Stock=${updateData[0].initial_stock}, Min=${updateData[0].min_purchase_qty}, LeadTime=${updateData[0].lead_time_days}`);
        } else {
            console.log(`Update yielded no data for ${item.name} (RLS or ID mismatch?)`);
        }
    }
    console.log('Done populating buffers.');
}

populateBuffers();
