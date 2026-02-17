
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function optimizeData() {
    console.log("Starting optimization for simulation...");

    // 1. Boost Initial Stock
    console.log("Boosting Initial Stock for all items...");
    const { data: items, error: itemError } = await supabase.from('items').select('id, initial_stock');
    if (itemError) throw itemError;

    let updatedItemsCount = 0;
    for (const item of items) {
        // Add 500 units to everything to ensure availability
        const newStock = (Number(item.initial_stock) || 0) + 500;
        await supabase.from('items').update({ initial_stock: newStock }).eq('id', item.id);
        updatedItemsCount++;
    }
    console.log(`Boosted stock for ${updatedItemsCount} items.`);

    // 2. Advance ERP Purchase Orders
    console.log("Advancing ERP Purchase Orders by 20 days...");
    const { data: pos, error: poError } = await supabase.from('erp_purchase_orders').select('id, expected_delivery_date');
    if (poError) throw poError;

    let updatedPOsCount = 0;
    for (const po of pos) {
        if (po.expected_delivery_date) {
            // Subtract 20 days to bring materials in earlier
            const newDate = new Date(new Date(po.expected_delivery_date).getTime() - 20 * 24 * 60 * 60 * 1000);
            await supabase.from('erp_purchase_orders').update({ expected_delivery_date: newDate.toISOString() }).eq('id', po.id);
            updatedPOsCount++;
        }
    }
    console.log(`Advancd delivery dates for ${updatedPOsCount} purchase orders.`);

    console.log("Optimization complete! Simulation should now show fewer material delays.");
}

optimizeData().catch(err => console.error("Error optimizing data:", err));
