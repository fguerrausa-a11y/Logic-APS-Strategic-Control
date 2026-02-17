
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { apsAlgorithm } from './services/apsAlgorithm';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

// Mock the global import.meta for the algorithm if needed, 
// but since we are importing the algorithm, we need to make sure it uses our client.
// Or we can just re-implement the runSimulation call here with the Node client.

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the most recent scenario
    const { data: scenario, error: scnErr } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (scnErr || !scenario) {
        console.error('Scenario not found', scnErr);
        return;
    }

    console.log(`Running simulation for scenario: ${scenario.name} (${scenario.id})`);

    // Trigger simulation
    // Note: We need to pass the dependencies to the algorithm or ensure it uses the right client.
    // Since apsAlgorithm.ts imports its own client, we might need to override it or just 
    // use the logic directly.

    try {
        // The apsAlgorithm.runSimulation needs to be called. 
        // It uses the singleton 'supabase' from supabaseClient.ts.
        // We can try to run it using 'tsx' which might handle the import.meta if we are lucky,
        // or we just manually run the calculateAPS logic here.

        const [
            { data: itemsRaw }, { data: bomRaw }, { data: routingsRaw },
            { data: machinesRaw }, { data: workOrdersRaw },
            { data: erpPurchaseOrders }, { data: existingOps },
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

        const result = apsAlgorithm.calculateAPS({
            items: itemsRaw || [],
            bom: bomRaw || [],
            routings: routingsRaw || [],
            machines: machinesRaw || [],
            workOrders: workOrdersRaw || [],
            erpPurchases: erpPurchaseOrders || [],
            existingOps: existingOps || [],
            maintenancePlans: maintenancePlans || [],
            workCenters: workCenters || [],
            settings
        });

        console.log('Calculation complete. Persisting results...');

        await Promise.all([
            supabase.from('proposed_work_orders').delete().eq('scenario_id', scenario.id),
            supabase.from('proposed_purchase_orders').delete().eq('scenario_id', scenario.id),
            supabase.from('proposed_operations').delete().eq('scenario_id', scenario.id)
        ]);

        const pWOs = result.proposedWorkOrders.map(wo => ({ ...wo, scenario_id: scenario.id }));
        const pPOs = result.proposedPurchaseOrders.map(po => ({ ...po, scenario_id: scenario.id }));
        const pOps = result.proposedOperations.map(op => ({ ...op, scenario_id: scenario.id }));

        if (pWOs.length > 0) await supabase.from('proposed_work_orders').insert(pWOs);
        if (pPOs.length > 0) await supabase.from('proposed_purchase_orders').insert(pPOs);
        if (pOps.length > 0) await supabase.from('proposed_operations').insert(pOps);

        console.log('Simulation finished successfully!');
    } catch (err) {
        console.error('Simulation failed', err);
    }
}

run();
