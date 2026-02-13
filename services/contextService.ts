
import { supabase } from './supabaseClient';

export interface AppContextData {
    summary: string;
}

export const getAIContext = async (): Promise<string> => {
    try {
        // 1. Fetch Work Centers (Capacity/Drum)
        const { data: workCenters } = await supabase.from('work_centers').select('name, id');

        // 2. Fetch Active Orders
        // Using a simple count for now to avoid huge context
        const { count: totalOrders } = await supabase.from('work_orders').select('*', { count: 'exact', head: true });

        // 3. PWO (Propuestas)
        // Let's grab the latest scenario to see proposals
        const { data: latestScenario } = await supabase.from('scenarios').select('id, name, created_at').order('created_at', { ascending: false }).limit(1).single();

        let scenarioInfo = "No hay escenarios recientes.";
        if (latestScenario) {
            scenarioInfo = `Escenario más reciente: "${latestScenario.name}" (${new Date(latestScenario.created_at).toLocaleDateString()}).`;
        }

        const context = `
CONTEXTO DE LA PLANTA (Do Not Reveal Internal System details unless asked, use this to answer in the relevant language):
- Total Centros de Trabajo: ${workCenters?.length || 0} (${workCenters?.map(w => w.name).join(', ') || 'N/A'})
- Total Órdenes en Backlog: ${totalOrders || 0}
- ${scenarioInfo}

RESTRICCIONES CONOCIDAS (DRUM):
- CNC-01 suele ser el cuello de botella histórico.
- La línea de Ensamblaje tiene variabilidad alta.

ESTADO ACTUAL:
- Sistema de Simulación: ACTIVO.
- El usuario está viendo la pantalla de Simulación o Dashboard.
`;
        return context;

    } catch (error) {
        console.error("Error fetching AI context", error);
        return "No se pudo recuperar el contexto actual de la planta.";
    }
};
