
import { apsAlgorithm, APSResult } from './apsAlgorithm';

export interface CertificationResult {
    id: number;
    config: any;
    result: APSResult;
    score: number;
    passed: boolean;
}

export const certificationService = {
    getGoldDataset: () => ({
        items: [
            { id: 'FG-01', name: 'Producto Final Certificado', current_stock: 0, lead_time_days: 2 },
            { id: 'RM-01', name: 'Materia Prima Crítica', current_stock: 0, lead_time_days: 10 }
        ],
        bom: [
            { parent_item_id: 'FG-01', component_item_id: 'RM-01', quantity_required: 1 }
        ],
        routings: [
            { item_id: 'FG-01', work_center_id: 'WC-PREP', operation_sequence: 10, setup_time_minutes: 60, run_time_minutes_per_unit: 10 },
            { item_id: 'FG-01', work_center_id: 'WC-MACH', operation_sequence: 20, setup_time_minutes: 120, run_time_minutes_per_unit: 30 }, // Bottleneck
            { item_id: 'FG-01', work_center_id: 'WC-ASSY', operation_sequence: 30, setup_time_minutes: 30, run_time_minutes_per_unit: 15 }
        ],
        machines: [
            { id: 'M1', name: 'Prep 1', work_center_id: 'WC-PREP', efficiency_factor: 1.0 },
            { id: 'M2', name: 'CNC Bottleneck', work_center_id: 'WC-MACH', efficiency_factor: 0.8 }, // Only one and slower!
            { id: 'M3', name: 'Assy 1', work_center_id: 'WC-ASSY', efficiency_factor: 1.0 }
        ],
        workOrders: [
            { id: 'CERT-001', item_id: 'FG-01', quantity_ordered: 50, due_date: '2026-03-15T17:00:00Z' }
        ],
        erpPurchases: [],
        existingOps: [],
        workCenters: [
            { id: 'WC-PREP', name: 'Preparación', efficiency_factor: 0.95 },
            { id: 'WC-MACH', name: 'Mecanizado', efficiency_factor: 0.85 },
            { id: 'WC-ASSY', name: 'Ensamblaje', efficiency_factor: 1.0 }
        ],
        maintenancePlans: [
            {
                id: 'MAINT-001',
                machine_id: 'M2',
                title: 'Mantenimiento Preventivo CNC',
                start_date: '2026-03-02T08:00:00Z',
                end_date: '2026-03-02T12:00:00Z'
            }
        ]
    }),

    runFullAudit: (): CertificationResult[] => {
        const MODALITIES = ['TOC Optimized', 'Forward ASAP', 'Backward JIT'];
        const BOTTLENECK_MGMT = ['Drum-Buffer-Rope', 'Infinite Capacity'];
        const REPROVISION_POLICIES = ['TOC Replenishment', 'MRP Standard', 'Stock-to-Order'];
        const OVERLAP_OPTIONS = [true, false];

        const data = certificationService.getGoldDataset();
        const results: CertificationResult[] = [];
        let id = 1;

        MODALITIES.forEach(mode => {
            BOTTLENECK_MGMT.forEach(bm => {
                REPROVISION_POLICIES.forEach(policy => {
                    OVERLAP_OPTIONS.forEach(overlap => {
                        const settings = {
                            scheduling_mode: mode,
                            bottleneck_management: bm,
                            reprovision_policy: policy,
                            overlap_enabled: overlap,
                            default_buffer_days: 2,
                            include_maintenance: true
                        };

                        const res = apsAlgorithm.calculateAPS({ ...data, settings } as any);

                        // Validaciones automáticas (Heurísticas de certificación)
                        let passed = true;
                        if (overlap && res.metrics!.totalMakespanHours >= 100) passed = false; // El overlap debería bajar el tiempo significativamente

                        results.push({
                            id: id++,
                            config: settings,
                            result: res,
                            score: 100, // Placeholder for ranking
                            passed
                        });
                    });
                });
            });
        });

        return results;
    }
};
