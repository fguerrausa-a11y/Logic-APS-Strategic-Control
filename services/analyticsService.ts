
import { supabase } from './supabaseClient';

export interface AnalyticsData {
    mttr: number;
    mtbf: number;
    scrapRate: number;
    cycleTimeVariance: number;
    demandMix: {
        standard: number;
        urgent: number;
        special: number;
    };
    performanceData: {
        name: string;
        planned: number;
        real: number;
    }[];
}

export const analyticsService = {
    async fetchAnalytics(): Promise<AnalyticsData> {
        try {
            // 1. Demand Mix from work_orders
            const { data: woData } = await supabase
                .from('work_orders')
                .select('priority');

            let standard = 0, urgent = 0, special = 0;
            if (woData && woData.length > 0) {
                woData.forEach(wo => {
                    if (wo.priority >= 4) urgent++;
                    else if (wo.priority <= 1) special++;
                    else standard++;
                });
                const total = woData.length;
                standard = Math.round((standard / total) * 100);
                urgent = Math.round((urgent / total) * 100);
                special = Math.round((special / total) * 100);
            } else {
                // Fallback demo data
                standard = 65; urgent = 20; special = 15;
            }

            // 2. Performance Data (Mocking trend for now until we have historical_production)
            const performanceData = [
                { name: 'Lun', planned: 4000, real: 2400 },
                { name: 'Mar', planned: 3000, real: 1398 },
                { name: 'Mie', planned: 2000, real: 9800 },
                { name: 'Jue', planned: 2780, real: 3908 },
                { name: 'Vie', planned: 1890, real: 4800 },
                { name: 'Sab', planned: 2390, real: 3800 },
                { name: 'Dom', planned: 3490, real: 4300 },
            ];

            // 3. Cycle Time Variance (Comparing proposed vs estimate)
            const { data: propOps } = await supabase.from('proposed_operations').select('run_time_minutes, quantity, item_id, operation_sequence');
            const { data: routings } = await supabase.from('routings').select('item_id, operation_sequence, run_time_minutes_per_unit');

            let cycleTimeVariance = -0.3; // Default
            if (propOps && routings && propOps.length > 0) {
                let totalDiff = 0;
                let count = 0;
                propOps.forEach(op => {
                    const route = routings.find(r => r.item_id === op.item_id && r.operation_sequence === op.operation_sequence);
                    if (route) {
                        const standardTime = route.run_time_minutes_per_unit * op.quantity;
                        const variance = op.run_time_minutes - standardTime;
                        totalDiff += variance;
                        count++;
                    }
                });
                if (count > 0) cycleTimeVariance = parseFloat((totalDiff / count / 60).toFixed(1)); // in hours
            }

            // 4. MTTR / MTBF / Scrap (Placeholder for now)
            return {
                mttr: 1.2,
                mtbf: 142,
                scrapRate: 1.4,
                cycleTimeVariance,
                demandMix: { standard, urgent, special },
                performanceData
            };
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }
};
