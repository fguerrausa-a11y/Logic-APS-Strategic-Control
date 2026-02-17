
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umrzvyrnyljcqcdmktcg.supabase.co';
const supabaseAnonKey = 'sb_publishable_sdI_UBccTtvjHdpIj9hDHw_Qi5gFm_L';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data: scenario } = await supabase.from('scenarios').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!scenario) return;

    console.log(`Motor Arrancado: ${scenario.name}`);

    const [
        { data: items }, { data: bom }, { data: routings },
        { data: machines }, { data: workOrders },
        { data: erpPurchases }, { data: existingOps },
        { data: maintenancePlans }, { data: workCenters }
    ] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('bom').select('*'),
        supabase.from('routings').select('*'),
        supabase.from('machines').select('*, shift:shifts(*)'),
        supabase.from('work_orders').select('*'),
        supabase.from('erp_purchase_orders').select('*'),
        supabase.from('proposed_operations').select('*').eq('scenario_id', scenario.id),
        supabase.from('maintenance_plans').select('*'),
        supabase.from('work_centers').select('*')
    ]);

    const settings = scenario;

    // Abridged Calculation (The core logic)
    const SIM_START_MS = new Date().getTime();
    const SIM_START_ISO = new Date().toISOString();
    const machineOverrides = settings.simulation_overrides?.machine_counts || {};
    const simulatedMachines: any[] = [];
    const allWCs = new Set([...(routings || []).map((r: any) => r.work_center_id), ...Object.keys(machineOverrides)]);

    allWCs.forEach(wcId => {
        const realWCMachines = (machines || []).filter((m: any) => m.work_center_id === wcId);
        const count = machineOverrides[wcId] !== undefined ? Number(machineOverrides[wcId]) : realWCMachines.length;
        for (let i = 0; i < count; i++) {
            const realM = realWCMachines[i];
            simulatedMachines.push({
                ...(realM || realWCMachines[0] || {}),
                id: realM ? realM.id : `v-mach-${wcId}-${i}`,
                work_center_id: wcId,
                name: realM ? realM.name : `Virtual ${i + 1}`,
                is_virtual: !realM,
                shift: realM?.shift || (realWCMachines[0]?.shift) || null
            });
        }
    });

    const proposedWorkOrders: any[] = [];
    const proposedPurchaseOrders: any[] = [];
    const proposedOperations: any[] = [];
    const lockedOps = (existingOps || []).filter((o: any) => o.is_locked);
    const machineOccupancy: Record<string, any[]> = {};

    simulatedMachines.forEach(m => {
        machineOccupancy[m.id] = (lockedOps || []).filter((lo: any) => String(lo.machine_id) === String(m.id)).map((lock: any) => ({ start: new Date(lock.start_date).getTime(), end: new Date(lock.end_date).getTime(), type: 'LOCKED' }));
        machineOccupancy[m.id].sort((a, b) => a.start - b.start);
    });

    const toISO = (ts: any) => new Date(ts).toISOString();

    const addWorkingTime = (start: number, durationMs: number, shift: any): number => {
        if (!shift) return start + durationMs;
        let current = start; let rem = durationMs;
        while (rem > 0) {
            const d = new Date(current);
            if (!shift.days_of_week?.includes(d.getDay())) { d.setHours(24, 0, 0, 0); current = d.getTime(); continue; }
            const [sh, sm] = (shift.start_time || "00:00").split(':').map(Number);
            const [eh, em] = (shift.end_time || "23:59").split(':').map(Number);
            const sOfDay = new Date(d).setHours(sh, sm, 0, 0);
            const eOfDay = new Date(d).setHours(eh, em, 0, 0);
            if (current < sOfDay) current = sOfDay;
            if (current >= eOfDay) { d.setHours(24, 0, 0, 0); current = d.getTime(); continue; }
            const avail = eOfDay - current; const use = Math.min(avail, rem);
            current += use; rem -= use;
        }
        return current;
    };

    const findSlot = (mId: string, minS: number, dur: number) => {
        const m = simulatedMachines.find(ma => ma.id === mId);
        let pot = Math.max(SIM_START_MS, minS);
        let f = false;
        while (!f) {
            const end = addWorkingTime(pot, dur, m?.shift);
            const conf = (machineOccupancy[mId] || []).find(inv => (pot >= inv.start && pot < inv.end) || (end > inv.start && end <= inv.end));
            if (conf) pot = conf.end + 60000; else f = true;
        }
        return pot;
    };

    // Simplified fulfillment logic for the demo run
    (workOrders || []).sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).forEach((wo: any) => {
        const rts = (routings || []).filter((r: any) => r.item_id === wo.item_id).sort((a: any, b: any) => a.operation_sequence - b.operation_sequence);
        let minS = SIM_START_MS;
        rts.forEach((route: any) => {
            const mtrs = simulatedMachines.filter(m => m.work_center_id === route.work_center_id);
            const limit = Number(settings.simulation_overrides?.max_split_machines || 1);
            const numSplits = settings.simulation_overrides?.split_ops_enabled ? Math.min(limit, mtrs.length) : 1;
            const subQty = Math.ceil(wo.quantity_ordered / numSplits);
            let ends: number[] = [];
            for (let i = 0; i < numSplits; i++) {
                const subQ = Math.min(subQty, wo.quantity_ordered - (i * subQty));
                if (subQ <= 0) break;
                const mId = mtrs[i % mtrs.length].id;
                const dur = (route.setup_time_minutes + (route.run_time_minutes_per_unit * subQ)) * 60 * 1000;
                const start = findSlot(mId, minS, dur);
                const end = addWorkingTime(start, dur, mtrs[i % mtrs.length].shift);
                proposedOperations.push({ scenario_id: scenario.id, work_order_id: wo.id, item_id: wo.item_id, machine_id: mId, work_center_id: route.work_center_id, start_date: toISO(start), end_date: toISO(end), quantity: subQ, operation_sequence: route.operation_sequence });
                machineOccupancy[mId].push({ start, end });
                ends.push(end);
            }
            minS = Math.max(...ends);
        });
        proposedWorkOrders.push({ scenario_id: scenario.id, work_order_id: wo.id, item_id: wo.item_id, quantity: wo.quantity_ordered, start_date: SIM_START_ISO, end_date: toISO(minS), due_date: wo.due_date, severity: minS > new Date(wo.due_date).getTime() ? 'red' : 'green' });
    });

    console.log(`Persisting ${proposedOperations.length} operations...`);
    await Promise.all([
        supabase.from('proposed_work_orders').delete().eq('scenario_id', scenario.id),
        supabase.from('proposed_operations').delete().eq('scenario_id', scenario.id)
    ]);
    if (proposedWorkOrders.length > 0) await supabase.from('proposed_work_orders').insert(proposedWorkOrders);
    if (proposedOperations.length > 0) await supabase.from('proposed_operations').insert(proposedOperations);

    console.log('Motor Terminado con éxito.');
}

run();
