
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

async function shiftDates() {
    console.log("Starting date shift operation...");

    // 1. Shift Work Orders (due_date)
    console.log("Shifting Work Orders...");
    const { data: wos, error: woError } = await supabase.from('work_orders').select('id, due_date');
    if (woError) throw woError;

    for (const wo of wos) {
        if (wo.due_date) {
            const newDate = new Date(new Date(wo.due_date).getTime() + 30 * 24 * 60 * 60 * 1000);
            await supabase.from('work_orders').update({ due_date: newDate.toISOString() }).eq('id', wo.id);
        }
    }

    // 2. Shift ERP Purchase Orders (expected_delivery_date)
    console.log("Shifting ERP Purchase Orders...");
    const { data: pos, error: poError } = await supabase.from('erp_purchase_orders').select('id, expected_delivery_date');
    if (poError) throw poError;

    for (const po of pos) {
        if (po.expected_delivery_date) {
            const newDate = new Date(new Date(po.expected_delivery_date).getTime() + 30 * 24 * 60 * 60 * 1000);
            await supabase.from('erp_purchase_orders').update({ expected_delivery_date: newDate.toISOString() }).eq('id', po.id);
        }
    }

    // 3. Shift Maintenance Plans (start_date, end_date)
    console.log("Shifting Maintenance Plans...");
    const { data: mps, error: mpError } = await supabase.from('maintenance_plans').select('id, start_date, end_date');
    if (mpError) throw mpError;

    for (const mp of mps) {
        const updates = {};
        if (mp.start_date) {
            const newStart = new Date(new Date(mp.start_date).getTime() + 30 * 24 * 60 * 60 * 1000);
            updates.start_date = newStart.toISOString();
        }
        if (mp.end_date) {
            const newEnd = new Date(new Date(mp.end_date).getTime() + 30 * 24 * 60 * 60 * 1000);
            updates.end_date = newEnd.toISOString();
        }
        if (Object.keys(updates).length > 0) {
            await supabase.from('maintenance_plans').update(updates).eq('id', mp.id);
        }
    }

    // 4. Shift Existing Operations (start_date, end_date) - if any are locked scenarios
    console.log("Shifting Locked Operations...");
    const { data: ops, error: opError } = await supabase.from('proposed_operations').select('id, start_date, end_date').eq('is_locked', true);
    if (opError) throw opError;

    if (ops && ops.length > 0) {
        for (const op of ops) {
            const updates = {};
            if (op.start_date) {
                const newStart = new Date(new Date(op.start_date).getTime() + 30 * 24 * 60 * 60 * 1000);
                updates.start_date = newStart.toISOString();
            }
            if (op.end_date) {
                const newEnd = new Date(new Date(op.end_date).getTime() + 30 * 24 * 60 * 60 * 1000);
                updates.end_date = newEnd.toISOString();
            }
            await supabase.from('proposed_operations').update(updates).eq('id', op.id);
        }
    }

    console.log("All dates shifted successfully by 30 days!");
}

shiftDates().catch(err => console.error("Error shifting dates:", err));
