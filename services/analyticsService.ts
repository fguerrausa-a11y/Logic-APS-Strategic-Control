
import { supabase } from './supabaseClient';

export interface AnalyticsData {
    mttr: number;           // hours
    mtbf: number;           // hours
    scrapRate: number;      // %
    cycleTimeVariance: number; // seconds
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the ISO week label "Sem N" for a given date */
const weekLabel = (date: Date): string => {
    const start = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `S${week}`;
};

const groupByWeek = (rows: { date: string; qty: number }[]): Record<string, number> => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
        const key = weekLabel(new Date(r.date));
        map[key] = (map[key] || 0) + r.qty;
    });
    return map;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const analyticsService = {
    async fetchAnalytics(): Promise<AnalyticsData> {
        try {
            const [
                maintRes,
                machinesRes,
                woRes,
                propWoRes,
                propOpsRes,
                routingsRes,
            ] = await Promise.all([
                supabase.from('maintenance_plans').select('type, status, start_date, end_date'),
                supabase.from('machines').select('id'),
                supabase.from('work_orders').select('priority, status, quantity_ordered, quantity_completed, due_date'),
                supabase.from('proposed_work_orders')
                    .select('quantity, end_date, scenario_id')
                    .order('created_at', { ascending: false })
                    .limit(500),
                supabase.from('proposed_operations').select('run_time_minutes, quantity, item_id, operation_sequence'),
                supabase.from('routings').select('item_id, operation_sequence, run_time_minutes_per_unit'),
            ]);

            // ── 1. MTTR (Mean Time To Repair) ────────────────────────────────
            // Average duration of corrective maintenance events in hours
            const corrective = (maintRes.data || []).filter(m => m.type === 'Corrective' && m.start_date && m.end_date);
            let mttr = 4; // fallback: 4h
            if (corrective.length > 0) {
                const totalHours = corrective.reduce((acc, m) => {
                    const diff = new Date(m.end_date).getTime() - new Date(m.start_date).getTime();
                    return acc + diff / 3600000;
                }, 0);
                mttr = parseFloat((totalHours / corrective.length).toFixed(1));
            }

            // ── 2. MTBF (Mean Time Between Failures) ─────────────────────────
            // Available machine hours over 30 days / number of corrective failures
            const machineCount = (machinesRes.data || []).length || 1;
            const availableHours = machineCount * 8 * 30; // 8h/day × 30 days
            const failureCount = corrective.length || 1;
            const mtbf = parseFloat((availableHours / failureCount).toFixed(0));

            // ── 3. Scrap Rate ─────────────────────────────────────────────────
            // (qty_ordered - qty_completed) / qty_ordered for Completed WOs
            const completedWOs = (woRes.data || []).filter(wo => wo.status === 'Completed');
            let scrapRate = 0;
            if (completedWOs.length > 0) {
                const totalOrdered = completedWOs.reduce((acc, wo) => acc + Number(wo.quantity_ordered || 0), 0);
                const totalCompleted = completedWOs.reduce((acc, wo) => acc + Number(wo.quantity_completed || 0), 0);
                if (totalOrdered > 0) {
                    scrapRate = parseFloat(((totalOrdered - totalCompleted) / totalOrdered * 100).toFixed(1));
                }
            }

            // ── 4. Demand Mix ─────────────────────────────────────────────────
            const woData = woRes.data || [];
            let standard = 65, urgent = 20, special = 15;
            if (woData.length > 0) {
                let s = 0, u = 0, sp = 0;
                woData.forEach(wo => {
                    if (wo.priority >= 4) u++;
                    else if (wo.priority <= 1) sp++;
                    else s++;
                });
                const total = woData.length;
                standard = Math.round((s / total) * 100);
                urgent = Math.round((u / total) * 100);
                special = Math.round((sp / total) * 100);
            }

            // ── 5. Performance Chart: Previsto vs Real (last 8 weeks) ─────────
            // Planned: latest scenario's proposed_work_orders, grouped by week of end_date
            // Real: completed work_orders.quantity_completed grouped by week of due_date
            const propWos = propWoRes.data || [];
            const lastScenarioId = propWos[0]?.scenario_id;
            const scenarioPWOs = lastScenarioId
                ? propWos.filter(p => p.scenario_id === lastScenarioId)
                : propWos;

            const plannedByWeek = groupByWeek(
                scenarioPWOs.map(p => ({ date: p.end_date, qty: Number(p.quantity || 0) }))
            );
            const realByWeek = groupByWeek(
                completedWOs.map(wo => ({ date: wo.due_date, qty: Number(wo.quantity_completed || wo.quantity_ordered || 0) }))
            );

            // Merge all week keys and sort
            const allWeeks = Array.from(new Set([...Object.keys(plannedByWeek), ...Object.keys(realByWeek)]))
                .sort((a, b) => {
                    const na = parseInt(a.replace('S', ''));
                    const nb = parseInt(b.replace('S', ''));
                    return na - nb;
                })
                .slice(-8); // last 8 weeks

            const performanceData = allWeeks.length > 0
                ? allWeeks.map(week => ({
                    name: week,
                    planned: plannedByWeek[week] || 0,
                    real: realByWeek[week] || 0,
                }))
                : [
                    // Fallback: synthetic weekly distribution from totals
                    { name: 'S10', planned: 12, real: 8 },
                    { name: 'S11', planned: 15, real: 11 },
                    { name: 'S12', planned: 18, real: 14 },
                    { name: 'S13', planned: 20, real: 17 },
                    { name: 'S14', planned: 22, real: 19 },
                    { name: 'S15', planned: 25, real: 20 },
                    { name: 'S16', planned: 28, real: 22 },
                ];

            // ── 6. Cycle Time Variance ────────────────────────────────────────
            const propOps = propOpsRes.data || [];
            const routings = routingsRes.data || [];
            let cycleTimeVariance = 0;
            if (propOps.length > 0 && routings.length > 0) {
                let totalDiff = 0, count = 0;
                propOps.forEach(op => {
                    const route = routings.find(r => r.item_id === op.item_id && r.operation_sequence === op.operation_sequence);
                    if (route) {
                        const standardTime = route.run_time_minutes_per_unit * op.quantity;
                        totalDiff += op.run_time_minutes - standardTime;
                        count++;
                    }
                });
                if (count > 0) cycleTimeVariance = parseFloat((totalDiff / count / 60).toFixed(1));
            }

            return { mttr, mtbf, scrapRate, cycleTimeVariance, demandMix: { standard, urgent, special }, performanceData };

        } catch (error) {
            console.error('Analytics: error fetching data:', error);
            throw error;
        }
    }
};



