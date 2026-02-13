
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umrzvyrnyljcqcdmktcg.supabase.co';
const supabaseAnonKey = 'sb_publishable_sdI_UBccTtvjHdpIj9hDHw_Qi5gFm_L';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('--- Iniciando Sembrado de Datos APS ---');

    // 1. Items
    const newItems = [
        { id: 'FG-SERVER-Rack', name: 'Rack de Servidores High-Density', unit_of_measure: 'un', category: 'Finished Goods' },
        { id: 'FG-HVAC-Unit', name: 'Unidad Central de Climatización Industrial', unit_of_measure: 'un', category: 'Finished Goods' },
        { id: 'FG-ELEC-Panel', name: 'Tablero Eléctrico de Potencia 100kW', unit_of_measure: 'un', category: 'Finished Goods' },
        { id: 'SA-METAL-Frame', name: 'Chasis de Acero Reforzado', unit_of_measure: 'un', category: 'Sub-Assemblies' },
        { id: 'SA-PCB-Main', name: 'Placa Lógica Principal v2.0', unit_of_measure: 'un', category: 'Sub-Assemblies' },
        { id: 'RM-STEEL-Sheet', name: 'Chapa de Acero Inox 2mm', unit_of_measure: 'm2', category: 'Raw Materials' },
        { id: 'RM-COPPER-Bus', name: 'Barra de Cobre Electrolítico', unit_of_measure: 'kg', category: 'Raw Materials' }
    ];

    const { error: itemErr } = await supabase.from('items').upsert(newItems);
    if (itemErr) console.error('Error items:', itemErr);
    else console.log('✅ Items insertados.');

    // 2. Centros de Trabajo y Máquinas (Actualización de nombres o adición)
    const newMachines = [
        { id: 'CNC-LASER-02', name: 'Láser Fibra Óptica 4kW', work_center_id: 'WC001' },
        { id: 'CNC-FOLD-02', name: 'Plegadora Hidráulica CNC 2', work_center_id: 'WC002' },
        { id: 'ROBOT-WELD-02', name: 'Brazo Soldador Fanuc-X', work_center_id: 'WC004' },
        { id: 'ASM-LINE-4', name: 'Línea Ensamblaje 4 (Precisión)', work_center_id: 'WC003' },
        { id: 'ASM-LINE-5', name: 'Línea Ensamblaje 5 (Heavy)', work_center_id: 'WC003' }
    ];

    const { error: machErr } = await supabase.from('machines').upsert(newMachines);
    if (machErr) console.error('Error machines:', machErr);
    else console.log('✅ Máquinas nuevas insertadas.');

    // 3. Fórmulas (BOM)
    const newBoms = [
        { parent_item_id: 'FG-SERVER-Rack', component_item_id: 'SA-METAL-Frame', quantity_required: 1 },
        { parent_item_id: 'FG-SERVER-Rack', component_item_id: 'SA-PCB-Main', quantity_required: 4 },
        { parent_item_id: 'SA-METAL-Frame', component_item_id: 'RM-STEEL-Sheet', quantity_required: 3.5 },
        { parent_item_id: 'FG-ELEC-Panel', component_item_id: 'RM-COPPER-Bus', quantity_required: 12 }
    ];

    const { error: bomErr } = await supabase.from('bom').upsert(newBoms);
    if (bomErr) console.error('Error boms:', bomErr);
    else console.log('✅ BOMs insertadas.');

    // 4. Ruteos (Routings)
    const newRoutings = [
        // Servidor
        { item_id: 'FG-SERVER-Rack', operation_sequence: 10, work_center_id: 'WC001', setup_time_minutes: 60, run_time_minutes_per_unit: 120 },
        { item_id: 'FG-SERVER-Rack', operation_sequence: 20, work_center_id: 'WC004', setup_time_minutes: 30, run_time_minutes_per_unit: 90 },
        { item_id: 'FG-SERVER-Rack', operation_sequence: 30, work_center_id: 'WC003', setup_time_minutes: 15, run_time_minutes_per_unit: 180 },
        // Climatización
        { item_id: 'FG-HVAC-Unit', operation_sequence: 10, work_center_id: 'WC001', setup_time_minutes: 45, run_time_minutes_per_unit: 60 },
        { item_id: 'FG-HVAC-Unit', operation_sequence: 20, work_center_id: 'WC002', setup_time_minutes: 60, run_time_minutes_per_unit: 45 },
        { item_id: 'FG-HVAC-Unit', operation_sequence: 30, work_center_id: 'WC003', setup_time_minutes: 20, run_time_minutes_per_unit: 250 },
        // Chasis
        { item_id: 'SA-METAL-Frame', operation_sequence: 10, work_center_id: 'WC001', setup_time_minutes: 30, run_time_minutes_per_unit: 20 },
        { item_id: 'SA-METAL-Frame', operation_sequence: 20, work_center_id: 'WC002', setup_time_minutes: 20, run_time_minutes_per_unit: 15 }
    ];

    const { error: routErr } = await supabase.from('routings').upsert(newRoutings);
    if (routErr) console.error('Error routings:', routErr);
    else console.log('✅ Ruteos insertados.');

    // 5. Órdenes de Trabajo (Work Orders) para próximas semanas
    const baseDate = new Date();
    const newOrders = [
        { id: 'WO-8001', item_id: 'FG-SERVER-Rack', quantity_ordered: 5, due_date: addDays(baseDate, 10).toISOString(), status: 'Released', priority: 1 },
        { id: 'WO-8002', item_id: 'FG-SERVER-Rack', quantity_ordered: 3, due_date: addDays(baseDate, 15).toISOString(), status: 'Released', priority: 2 },
        { id: 'WO-8003', item_id: 'FG-HVAC-Unit', quantity_ordered: 12, due_date: addDays(baseDate, 12).toISOString(), status: 'Released', priority: 3 },
        { id: 'WO-8004', item_id: 'FG-ELEC-Panel', quantity_ordered: 20, due_date: addDays(baseDate, 8).toISOString(), status: 'Planned', priority: 1 },
        { id: 'WO-8005', item_id: 'SA-METAL-Frame', quantity_ordered: 50, due_date: addDays(baseDate, 5).toISOString(), status: 'Released', priority: 5 },
        { id: 'WO-8006', item_id: 'FG-SERVER-Rack', quantity_ordered: 8, due_date: addDays(baseDate, 20).toISOString(), status: 'Planned', priority: 2 }
    ];

    const { error: woErr } = await supabase.from('work_orders').upsert(newOrders);
    if (woErr) console.error('Error orders:', woErr);
    else console.log('✅ Órdenes de trabajo insertadas.');

    console.log('--- Sembrado de Datos APS Finalizado ---');
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

seed();
