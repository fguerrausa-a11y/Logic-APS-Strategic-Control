
import { apsAlgorithm } from './services/apsAlgorithm';
import { supabase } from './services/supabaseClient';

async function verify() {
    const scenarioId = '9c9cbb1b-4f9a-40ec-9bf8-df3b023c865c';
    console.log('Verificando simulación con capacidad corregida...');

    const result = await apsAlgorithm.runSimulation(scenarioId);

    console.log('--- RESULTADOS ---');
    result.proposedWorkOrders.forEach(p => {
        if (p.severity === 'red') {
            console.log(`Item: ${p.item_id}, Delay: ${p.delay_days}, Reason: ${p.delay_reason}`);
        }
    });
}

verify();
