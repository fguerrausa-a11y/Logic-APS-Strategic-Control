
import { supabase } from './supabaseClient';

export interface ScenarioData {
    name: string;
    description?: string;
    kpis: {
        leadTime: string;
        resourceUtilization: string;
        profitability: string;
    };
    resourceLoad: any;
    timelineData: any;
}

export const scenarioService = {
    /**
     * Guarda un nuevo escenario simulado
     */
    async saveScenario(scenario: ScenarioData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        // 1. Crear el registro del escenario
        const { data: scenarioRecord, error: sError } = await supabase
            .from('scenarios')
            .insert({
                user_id: user.id,
                name: scenario.name,
                description: scenario.description
            })
            .select()
            .single();

        if (sError) throw sError;

        // 2. Guardar los datos del cálculo asociados
        const { error: cError } = await supabase
            .from('calculations')
            .insert({
                scenario_id: scenarioRecord.id,
                user_id: user.id,
                data: {
                    kpis: scenario.kpis,
                    resourceLoad: scenario.resourceLoad,
                    timelineData: scenario.timelineData
                }
            });

        if (cError) throw cError;

        return scenarioRecord;
    },

    /**
     * Obtiene todos los escenarios del usuario
     */
    async getScenarios() {
        const { data, error } = await supabase
            .from('scenarios')
            .select(`
        *,
        calculations (
          data
        )
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Elimina un escenario
     */
    async deleteScenario(id: string) {
        const { error } = await supabase
            .from('scenarios')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Aplica un escenario a la planificación real (Placeholder funcional)
     */
    async applyToLive(scenarioId: string) {
        // Aquí iría la lógica para sobrescribir la tabla de "Producción Real"
        // con los datos de este escenario específico.
        console.log('Aplicando escenario a producción real:', scenarioId);
        return { success: true };
    }
};
