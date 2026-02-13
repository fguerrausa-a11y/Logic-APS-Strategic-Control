
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umrzvyrnyljcqcdmktcg.supabase.co';
const supabaseAnonKey = 'sb_publishable_sdI_UBccTtvjHdpIj9hDHw_Qi5gFm_L';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('--- Iniciando Sembrado de Datos para Analíticas ---');

    const baseDate = new Date();
    const items = ['FG-SERVER-Rack', 'FG-HVAC-Unit', 'FG-ELEC-Panel', 'SA-METAL-Frame'];

    const extraOrders = [];
    for (let i = 1; i <= 20; i++) {
        const priority = Math.floor(Math.random() * 5) + 1; // 1 to 5
        const item = items[Math.floor(Math.random() * items.length)];
        const qty = Math.floor(Math.random() * 100) + 10;
        const dueDays = Math.floor(Math.random() * 30) + 1;

        extraOrders.push({
            id: `WO-ANLYS-${1000 + i}`,
            item_id: item,
            quantity_ordered: qty,
            due_date: new Date(baseDate.getTime() + dueDays * 24 * 60 * 60 * 1000).toISOString(),
            status: i % 3 === 0 ? 'Completed' : 'Released',
            priority: priority
        });
    }

    const { error } = await supabase.from('work_orders').upsert(extraOrders);
    if (error) console.error('Error seeding orders:', error);
    else console.log('✅ 20 nuevas órdenes de trabajo insertadas para analíticas.');

    console.log('--- Sembrado finalizado ---');
}

seed();
