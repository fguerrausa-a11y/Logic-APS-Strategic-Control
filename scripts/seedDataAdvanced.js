
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umrzvyrnyljcqcdmktcg.supabase.co';
const supabaseAnonKey = 'sb_publishable_sdI_UBccTtvjHdpIj9hDHw_Qi5gFm_L';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('--- Iniciando Sembrado Masivo APS + ERP Integration ---');

    // 1. Items con Stock Inicial
    const items = [
        { id: 'RM-STEEL-Sheet', name: 'Chapa de Acero Inox 2mm', uom: 'm2', initial_stock: 500 },
        { id: 'RM-COPPER-Bus', name: 'Barra de Cobre Electrolítico', uom: 'kg', initial_stock: 200 },
        { id: 'SA-METAL-Frame', name: 'Chasis de Acero Reforzado', uom: 'un', initial_stock: 20 },
        { id: 'SA-PCB-Main', name: 'Placa Lógica Principal v2.0', uom: 'un', initial_stock: 50 },
        { id: 'FG-SERVER-Rack', name: 'Rack de Servidores High-Density', uom: 'un', initial_stock: 5 },
        { id: 'FG-HVAC-Unit', name: 'Unidad Central de Climatización Industrial', uom: 'un', initial_stock: 2 }
    ];
    await supabase.from('items').upsert(items);
    console.log('✅ Items con stock inicial cargados.');

    // 2. Órdenes ya existentes en el ERP (Para comparar)
    const erpWOs = [
        { id: 'ERP-WO-1001', item_id: 'FG-SERVER-Rack', quantity_ordered: 10, due_date: addDays(new Date(), 12).toISOString(), status: 'Released', priority: 1 },
        { id: 'ERP-WO-1002', item_id: 'FG-HVAC-Unit', quantity_ordered: 5, due_date: addDays(new Date(), 18).toISOString(), status: 'Released', priority: 2 }
    ];
    await supabase.from('erp_work_orders').upsert(erpWOs);

    const erpPOs = [
        { id: 'ERP-PO-5001', item_id: 'RM-STEEL-Sheet', quantity_ordered: 1000, expected_delivery_date: addDays(new Date(), 5).toISOString(), status: 'Open' },
        { id: 'ERP-PO-5002', item_id: 'SA-PCB-Main', quantity_ordered: 100, expected_delivery_date: addDays(new Date(), 8).toISOString(), status: 'Open' }
    ];
    await supabase.from('erp_purchase_orders').upsert(erpPOs);
    console.log('✅ Datos existentes del ERP cargados.');

    // 3. Planes de Mantenimiento
    const maintenance = [
        { machine_id: 'CNC-LASER-02', title: 'Calibración Óptica Semestral', start_date: addDays(new Date(), 2).toISOString(), end_date: addDays(new Date(), 2.5).toISOString(), type: 'Preventive' },
        { machine_id: 'ROBOT-WELD-02', title: 'Engrase y Revisión de Servos', start_date: addDays(new Date(), 6).toISOString(), end_date: addDays(new Date(), 6.3).toISOString(), type: 'Preventive' },
        { machine_id: 'ASM-LINE-4', title: 'Cambio de Cinta Transportadora', start_date: addDays(new Date(), 10).toISOString(), end_date: addDays(new Date(), 11).toISOString(), type: 'Corrective' }
    ];
    await supabase.from('maintenance_plans').upsert(maintenance);
    console.log('✅ Planes de mantenimiento cargados.');

    // 4. Clientes y Pedidos (Demand)
    const demand = [
        { id: 'ORDER-9001', item_id: 'FG-SERVER-Rack', quantity_ordered: 15, due_date: addDays(new Date(), 20).toISOString(), priority: 1 },
        { id: 'ORDER-9002', item_id: 'FG-HVAC-Unit', quantity_ordered: 8, due_date: addDays(new Date(), 25).toISOString(), priority: 3 }
    ];
    await supabase.from('work_orders').upsert(demand);
    console.log('✅ Demanda proyectada cargada.');

    console.log('--- Sembrado Finalizado con Éxito ---');
}

function addDays(date, days) {
    const d = new Date(date);
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    return d;
}

seed();
