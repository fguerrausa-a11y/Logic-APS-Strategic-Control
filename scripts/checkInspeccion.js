import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data: wc } = await supabase.from('work_centers').select('id, name').ilike('name', '%inspecci%').single();
    if (!wc) {
        // try MESA
        const { data: q2 } = await supabase.from('work_centers').select('*');
        console.log('Todos los WC:', q2?.map(w => w.name));
        const res = q2?.find(w => w.name.toLowerCase().includes('inspección') || w.name.toLowerCase().includes('calidad'));
        if (!res) return console.log('no wc calidad/inspeccion');

        console.log('WC Encontrado:', res.name);

        const { data: routing } = await supabase.from('routings').select('*').eq('work_center_id', res.id);
        console.log('Routings para este WC:', routing);

        if (routing && routing.length > 0) {
            const items = [...new Set(routing.map(r => r.item_id))];
            const { data: wos } = await supabase.from('work_orders').select('*').in('item_id', items);
            console.log('Work orders para estos items:', wos);
        }
    } else {
        console.log('WC Encontrado:', wc);
    }
}
checkData();
