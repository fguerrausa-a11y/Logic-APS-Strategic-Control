
import { supabase } from './supabaseClient';

export interface APSResult {
    proposedWorkOrders: any[];
    proposedPurchaseOrders: any[];
    proposedOperations: any[];
    proposedMaintenance: any[];
    bottlenecks: any[];
    stockFlow: Record<string, any[]>;
    metrics?: {
        avgLeadTime: number;
        onTimeDeliveryRate: number;
        totalMakespanHours: number;
    };
}

interface Item { id: string; name: string; current_stock?: number; lead_time_days?: number; }
interface BOM { parent_item_id: string; component_item_id: string; quantity_required: number; }
interface Routing { item_id: string; work_center_id: string; operation_sequence: number; setup_time_minutes: number; run_time_minutes_per_unit: number; }
interface Machine { id: string; name: string; work_center_id: string; efficiency_factor?: number; is_active?: boolean; ignore_shifts?: boolean; shift?: { start_time: string, end_time: string, days_of_week: number[] }; }
interface WorkOrder { id: string; item_id: string; quantity_ordered: number; quantity_completed?: number; due_date: string; priority?: number; status?: string; }

export const apsAlgorithm = {
    /**
     * CORE CALCULATION ENGINE (Pure Function - No side effects)
     */
    calculateAPS(data: {
        items: Item[],
        bom: BOM[],
        routings: Routing[],
        machines: Machine[],
        workOrders: WorkOrder[],
        erpPurchases: any[],
        existingOps: any[],
        maintenancePlans: any[],
        workCenters: any[],
        settings: any
    }): APSResult {
        const { items, bom, routings, workOrders, erpPurchases, existingOps, maintenancePlans, workCenters, settings } = data;

        // Apply machine overrides and build simulated resource pool
        const machineOverrides = settings.simulation_overrides?.machine_counts || {};
        const simulatedMachines: any[] = [];

        // Identify all relevant Work Centers
        const allWCs = new Set<string>([...routings.map(r => r.work_center_id), ...Object.keys(machineOverrides)]);

        Array.from(allWCs).forEach(wcId => {
            // MEJORA: excluir máquinas con is_active=false del pool de recursos
            const realWCMachines = data.machines.filter(m =>
                m.work_center_id === wcId &&
                m.is_active !== false   // undefined o true = activa; false = inactiva
            );
            const overrideCount = machineOverrides[wcId];
            const targetCount = overrideCount !== undefined ? Number(overrideCount) : Math.max(realWCMachines.length, 1);

            for (let i = 0; i < targetCount; i++) {
                const realM = realWCMachines[i];
                simulatedMachines.push({
                    ...(realM || realWCMachines[0] || {}), // Use template if virtual
                    id: realM ? realM.id : `v-mach-${wcId}-${i}`,
                    work_center_id: wcId,
                    name: realM ? realM.name : `Mesa Virtual ${i + 1}`,
                    is_virtual: !realM,
                    // MEJORA: máquinas con ignore_shifts=true trabajan 24/7 (shift=null)
                    shift: realM?.ignore_shifts ? null : (realM?.shift || realWCMachines[0]?.shift || null)
                });
            }
        });

        // Use ONLY simulatedMachines for the rest of the algorithm
        const machines = simulatedMachines;

        const inspectWc = workCenters.find((w: any) => w.name.toLowerCase().includes('inspecci'));
        if (inspectWc) {
            const inspectRoutings = routings.filter(r => r.work_center_id === inspectWc.id);
            console.log('\n--- DEBUG INSPECCION ---');
            console.log(`WC: ${inspectWc.name} (${inspectWc.id})`);
            console.log(`Máquinas simuladas:`, machines.filter(m => m.work_center_id === inspectWc.id).map(m => m.name));
            console.log(`Routings que pasan por aca:`, inspectRoutings.map(r => r.item_id));
            console.log('------------------------\n');
        }


        // Simulación Stock Inicial - Ahora es dinámica (ASAP)
        const SIM_START = new Date();
        const SIM_START_ISO = SIM_START.toISOString();
        const SIM_START_MS = SIM_START.getTime();

        const simulationStock: Record<string, number> = {};
        const itemStockEvents: Record<string, any[]> = {};
        items.forEach(it => {
            const stock = Number(it.current_stock || (it as any).initial_stock || 0);
            // Debug Log
            if (it.id === 'RM-STEEL-SHEET' || it.name.includes('Chapa')) {
                console.log(`[APS DEBUG] Stock leído para ${it.name} (${it.id}): ${stock}`);
            }
            simulationStock[it.id] = stock;
            itemStockEvents[it.id] = [{ date: SIM_START_ISO, type: 'INITIAL', delta: stock, ref: 'Stock Inicial', priority: 0 }];
        });

        // Registrar Compras ERP
        erpPurchases.forEach(po => {
            itemStockEvents[po.item_id] = itemStockEvents[po.item_id] || [];
            itemStockEvents[po.item_id].push({
                date: po.expected_delivery_date,
                type: 'PURCHASE_ERP',
                delta: Number(po.quantity_ordered),
                ref: `ERP PO ${po.id}`,
                priority: 0.5,
                erp_id: po.id,
                is_fixed: po.is_fixed || false
            });
        });

        // Initialize internal state
        const proposedWorkOrders: any[] = [];
        const proposedPurchaseOrders: any[] = [];
        const proposedOperations: any[] = [];
        const lockedOps = (existingOps || []).filter(o => o.is_locked);
        const machineOccupancy: Record<string, { start: number, end: number, type: string }[]> = {};
        const plannedDemand = new Map<string, number>();

        // Use the simulated machines resolved at the beginning
        machines.forEach(m => {
            machineOccupancy[m.id] = (lockedOps || [])
                .filter(lo => String(lo.machine_id) === String(m.id))
                .map(lock => ({
                    start: new Date(lock.start_date).getTime(),
                    end: new Date(lock.end_date).getTime(),
                    type: 'LOCKED_OP'
                }));

            if (settings.include_maintenance) {
                const maint = (maintenancePlans || [])
                    .filter(p => String(p.machine_id) === String(m.id))
                    .map(p => ({
                        start: new Date(p.start_date).getTime(),
                        end: new Date(p.end_date).getTime(),
                        type: 'MAINTENANCE'
                    }));
                machineOccupancy[m.id].push(...maint);
            }
            machineOccupancy[m.id].sort((a, b) => a.start - b.start);
        });

        // ─────────────────────────────────────────────────────────────────────
        // TOC: IDENTIFICACIÓN REAL DEL CCR (Capacity Constraint Resource)
        // El CCR es el centro de trabajo con mayor ratio de carga estimada
        // vs capacidad disponible. Se calcula ANTES de la simulación usando
        // la demanda de las Work Orders como proxy de carga.
        //
        // Ratio = (carga total estimada en minutos) / (capacidad disponible en minutos)
        // El WC con ratio > 1 o el mayor ratio es el cuello de botella real.
        // ─────────────────────────────────────────────────────────────────────
        const PLANNING_DAYS = settings.planning_horizon_days || 90;
        const SHIFT_HOURS_DEFAULT = 8; // horas por turno si no hay turno configurado

        // Calcular carga estimada por WC a partir de routings + demanda abierta
        const wcLoad: Record<string, number> = {}; // WC_id → minutos de carga
        const wcCapacity: Record<string, number> = {}; // WC_id → minutos disponibles

        workCenters.forEach(wc => {
            const wcMachines = simulatedMachines.filter(m => m.work_center_id === wc.id);
            if (wcMachines.length === 0) return;

            // Capacidad disponible en el horizonte de planificación
            // Para cada máquina, se usan sus horas de turno configuradas
            let totalCapMinutes = 0;
            wcMachines.forEach(m => {
                const shift = m.shift;
                const hoursPerDay = m.ignore_shifts ? 24 :
                    shift
                        ? ((): number => {
                            const [sh, sm] = (shift.start_time || '00:00').split(':').map(Number);
                            const [eh, em] = (shift.end_time || '23:59').split(':').map(Number);
                            const h = (eh * 60 + em - (sh * 60 + sm)) / 60;
                            return Math.max(0, h);
                        })()
                        : SHIFT_HOURS_DEFAULT;
                const workingDaysPerWeek = shift?.days_of_week?.length ?? 5;
                const totalDays = PLANNING_DAYS * (workingDaysPerWeek / 7);
                totalCapMinutes += totalDays * hoursPerDay * 60;
            });
            wcCapacity[wc.id] = Math.max(1, totalCapMinutes);
            wcLoad[wc.id] = 0;
        });

        // Sumar carga desde Work Orders abiertas × routings
        workOrders.forEach(wo => {
            const woQty = Number(wo.quantity_ordered || 0) - Number(wo.quantity_completed || 0);
            if (woQty <= 0) return;
            routings.filter(r => r.item_id === wo.item_id).forEach(r => {
                if (!wcLoad.hasOwnProperty(r.work_center_id)) return;
                const wc = workCenters.find(w => w.id === r.work_center_id);
                const eff = Number(wc?.efficiency_factor || 1.0);
                const mins = (Number(r.setup_time_minutes || 0) + Number(r.run_time_minutes_per_unit || 0) * woQty) / eff;
                wcLoad[r.work_center_id] = (wcLoad[r.work_center_id] || 0) + mins;
            });
        });

        // El CCR es el WC con mayor ratio carga/capacidad
        let ccrWcId: string | null = null;
        let ccrRatio = 0;
        Object.keys(wcLoad).forEach(wcId => {
            const ratio = wcLoad[wcId] / (wcCapacity[wcId] || 1);
            if (ratio > ccrRatio) { ccrRatio = ratio; ccrWcId = wcId; }
        });

        // Buffer TOC: tiempo de protección ANTES de operaciones en el CCR.
        // Proporcional a default_buffer_days. Si no hay CCR real (ratio < 50%),
        // no se aplica buffer (la planta no está restringida).
        const tocBufferMs = ccrWcId && ccrRatio >= 0.5
            ? (settings.default_buffer_days || 1) * 24 * 60 * 60 * 1000 * 0.33  // 33% del buffer configurado
            : 0;

        console.log(`[APS TOC] CCR detected: ${ccrWcId || 'ninguno'} | Ratio: ${(ccrRatio * 100).toFixed(1)}% | Buffer: ${(tocBufferMs / 3600000).toFixed(1)}h`);
        // ─────────────────────────────────────────────────────────────────────

        const toISO = (ts: number | string | Date) => new Date(ts).toISOString();

        const getShiftInfo = (mId: string) => {
            const m = machines.find(mach => mach.id === mId);
            return m?.shift;
        };

        const isShiftActive = (ts: number, shift: any): boolean => {
            if (!shift) return true;
            const d = new Date(ts);
            if (!shift.days_of_week?.includes(d.getDay())) return false;
            const [sh, sm] = (shift.start_time || "00:00").split(':').map(Number);
            const [eh, em] = (shift.end_time || "23:59").split(':').map(Number);
            const currentMins = d.getHours() * 60 + d.getMinutes();
            return currentMins >= (sh * 60 + sm) && currentMins < (eh * 60 + em);
        };

        const addWorkingTime = (start: number, durationMs: number, shift: any): number => {
            if (!shift) return start + durationMs;
            let current = start;
            let remaining = durationMs;
            while (remaining > 0) {
                const d = new Date(current);
                if (!shift.days_of_week?.includes(d.getDay())) {
                    d.setHours(24, 0, 0, 0);
                    current = d.getTime();
                    continue;
                }
                const [sh, sm] = (shift.start_time || "00:00").split(':').map(Number);
                const [eh, em] = (shift.end_time || "23:59").split(':').map(Number);
                const startOfDay = new Date(d).setHours(sh, sm, 0, 0);
                const endOfDay = new Date(d).setHours(eh, em, 0, 0);
                if (current < startOfDay) current = startOfDay;
                if (current >= endOfDay) {
                    d.setHours(24, 0, 0, 0);
                    current = d.getTime();
                    continue;
                }
                const availableToday = endOfDay - current;
                const useToday = Math.min(availableToday, remaining);
                current += useToday;
                remaining -= useToday;
            }
            return current;
        };

        const findEarliestSlot = (machineId: string, minStart: number, durationMs: number): number => {
            const shift = getShiftInfo(machineId);
            let potentialStart = Math.max(SIM_START_MS, minStart);

            // ── INFINITE CAPACITY MODE ────────────────────────────────────────
            // Skip conflict checking entirely: assume unlimited parallel capacity.
            // The machine still respects its shift schedule (start/end hours),
            // but multiple operations can overlap on the same machine.
            if (settings.bottleneck_management === 'Infinite Capacity'
                || settings.simulation_overrides?.infinite_capacity === true) {
                if (!shift) return potentialStart;
                // Advance to shift start if we're before it
                const d = new Date(potentialStart);
                const [sh, sm] = (shift.start_time || '00:00').split(':').map(Number);
                const startOfDay = new Date(d).setHours(sh, sm, 0, 0);
                const [eh, em] = (shift.end_time || '23:59').split(':').map(Number);
                const endOfDay = new Date(d).setHours(eh, em, 0, 0);
                // If after shift end or on a non-working day, advance to next working day
                if (!shift.days_of_week?.includes(d.getDay()) || potentialStart >= endOfDay) {
                    d.setHours(24, 0, 0, 0);
                    return findEarliestSlot(machineId, d.getTime(), durationMs); // recurse to next day
                }
                return Math.max(potentialStart, startOfDay);
            }
            // ─────────────────────────────────────────────────────────────────

            const intervals = machineOccupancy[machineId] || [];

            let found = false;
            while (!found) {
                // Ensure potentialStart is within a shift
                if (shift) {
                    const d = new Date(potentialStart);
                    const [sh, sm] = (shift.start_time || "00:00").split(':').map(Number);
                    const startOfDay = new Date(d).setHours(sh, sm, 0, 0);
                    const [eh, em] = (shift.end_time || "23:59").split(':').map(Number);
                    const endOfDay = new Date(d).setHours(eh, em, 0, 0);

                    if (!shift.days_of_week?.includes(d.getDay()) || potentialStart >= endOfDay) {
                        d.setHours(24, 0, 0, 0);
                        potentialStart = d.getTime();
                        continue;
                    }
                    if (potentialStart < startOfDay) potentialStart = startOfDay;
                }

                const potentialEnd = addWorkingTime(potentialStart, durationMs, shift);
                const conflict = intervals.find(inv =>
                    (potentialStart >= inv.start && potentialStart < inv.end) ||
                    (potentialEnd > inv.start && potentialEnd <= inv.end) ||
                    (potentialStart <= inv.start && potentialEnd >= inv.end)
                );

                if (conflict) {
                    potentialStart = conflict.end + 60000; // Skip conflict + 1 min buffer
                } else {
                    found = true;
                }
            }
            return potentialStart;
        };

        const fulfillDemand = (itemId: string, qtyNeeded: number, requestedDate: number, ref: string, isRoot = false): { readyDate: number, reason: string } => {
            if (ref && plannedDemand.has(ref + itemId)) {
                return { readyDate: plannedDemand.get(ref + itemId)!, reason: 'none' };
            }
            const item = items.find(i => i.id === itemId);
            let currentReason = 'none';
            const projectedAtDate = (itemStockEvents[itemId] || [])
                .filter(e => new Date(e.date).getTime() <= requestedDate)
                .reduce((acc, curr) => acc + curr.delta, 0);

            const fromStock = Math.min(qtyNeeded, projectedAtDate);
            if (fromStock > 0) {
                itemStockEvents[itemId].push({ date: toISO(requestedDate), type: 'CONSUMPTION', delta: -fromStock, ref: `${ref} (Stock/ERP)`, priority: 3 });
            }

            const remaining = qtyNeeded - fromStock;
            if (remaining <= 0) {
                if (isRoot) proposedWorkOrders.push({ item_id: itemId, work_order_id: ref.replace('WO-', ''), quantity: qtyNeeded, start_date: SIM_START_ISO, end_date: SIM_START_ISO, due_date: toISO(requestedDate), delay_days: 0, severity: 'green', status: 'proposed', action_type: 'stock' });
                return { readyDate: requestedDate, reason: 'none' };
            }

            const itemRoutings = routings.filter(r => r.item_id === itemId).sort((a, b) => a.operation_sequence - b.operation_sequence);
            if (itemRoutings.length > 0) {
                let maxCompReady = SIM_START_MS;
                let componentReason = 'none';
                bom.filter(b => b.parent_item_id === itemId).forEach(comp => {
                    const result = fulfillDemand(comp.component_item_id, (Number(comp.quantity_required) || 1) * remaining, requestedDate, ref);
                    if (result.readyDate > maxCompReady) {
                        maxCompReady = result.readyDate;
                        componentReason = result.reason === 'none' ? 'supply' : result.reason;
                    }
                });

                let nextStepMinStart = maxCompReady;
                let prevOpStart = maxCompReady;
                let prevOpSetup = 0;
                let prevOpRunPerUnit = 0;

                // ── BACKWARD JIT MODE ─────────────────────────────────────────────
                // Work backwards from due date: calculate the effective duration of
                // each routing step considering split configuration, then delay the
                // start as late as possible (JIT = minimize WIP).
                //
                // KEY FIX: when split is active on a work center, N machines work
                // in PARALLEL on sub-lots of size ceil(qty/N). The duration of that
                // routing step is the sub-lot duration, NOT the full-lot duration.
                // Using the full-lot duration overestimates time → too-early start
                // (conservative but not truly JIT).
                if (settings.scheduling_mode === 'Backward JIT' && requestedDate > SIM_START_MS) {
                    const totalOpMs = itemRoutings.reduce((sum, r) => {
                        const wcEff = Number(workCenters.find(w => w.id === r.work_center_id)?.efficiency_factor || 1);

                        // Mirror the split logic used in the main scheduling loop
                        const wcConfig = settings.simulation_overrides?.work_center_configs?.[r.work_center_id];
                        const isSplitActive = Boolean(wcConfig?.enabled);
                        const userSplitLimit = Number(wcConfig?.maxSplit || 1);
                        const availableMachines = simulatedMachines.filter(m => m.work_center_id === r.work_center_id).length;
                        const numSplits = isSplitActive
                            ? Math.max(1, Math.min(userSplitLimit, availableMachines))
                            : 1;

                        // Effective quantity per machine (parallel sub-lots)
                        const subLotQty = Math.ceil(remaining / numSplits);

                        // Duration = time to process one sub-lot (they all run in parallel)
                        const opMs = ((Number(r.setup_time_minutes || 0) + Number(r.run_time_minutes_per_unit || 0) * subLotQty) / wcEff) * 60 * 1000;
                        return sum + opMs;
                    }, 0);
                    // JIT start: as late as possible to finish exactly at requestedDate
                    const jitStart = requestedDate - totalOpMs;
                    // Only delay if JIT start is later than components being ready
                    // (if components aren't ready in time, we start ASAP instead)
                    if (jitStart > maxCompReady) {
                        nextStepMinStart = jitStart;
                        prevOpStart = jitStart;
                    }
                }
                // ─────────────────────────────────────────────────────────────────

                itemRoutings.forEach((route, rIdx) => {
                    const mtrs = simulatedMachines.filter(m => m.work_center_id === route.work_center_id);
                    const isLocked = lockedOps.find(lo => String(lo.work_order_id || '').replace('WO-', '') === String(ref.replace('WO-', '')) && String(lo.operation_sequence) === String(route.operation_sequence));
                    const wc = workCenters.find(w => w.id === route.work_center_id);
                    const wcEfficiency = Number(wc?.efficiency_factor || 1.0);

                    // Strategy parameters - WORK CENTER SPECIFIC - REINFORCED
                    const wcConfig = settings.simulation_overrides?.work_center_configs?.[route.work_center_id];
                    const isSplitActive = Boolean(wcConfig?.enabled && !isLocked);
                    const userSplitLimit = Number(wcConfig?.maxSplit || 1);

                    // We split by MIN(User Limit, Available Capacity)
                    const availableMachinesCount = mtrs.length;
                    const numSplits = isSplitActive ? Math.max(1, Math.min(userSplitLimit, availableMachinesCount)) : 1;

                    const setup = Number(route.setup_time_minutes || 0);
                    const runPerUnit = Number(route.run_time_minutes_per_unit || 0);

                    let operationEndDates: number[] = [];
                    const subLotQty = Math.ceil(remaining / numSplits);
                    let leftToDistribute = remaining;

                    for (let i = 0; i < numSplits; i++) {
                        const qtyForThisMachine = Math.min(subLotQty, leftToDistribute);
                        if (qtyForThisMachine <= 0) break;

                        // UNIQUE MACHINE ASSIGNMENT: Prefer machines not already used for this split
                        const machineToUse = mtrs[i % mtrs.length];
                        if (!machineToUse) continue;
                        const chosenM = machineToUse.id;

                        // OVERLAP LOGIC for this sub-lot
                        let minStart = nextStepMinStart;
                        const isOverlapActive = settings.simulation_overrides?.overlap_enabled || settings.overlap_enabled;

                        if (isOverlapActive && rIdx > 0) {
                            const prevWC = workCenters.find(w => w.id === itemRoutings[rIdx - 1].work_center_id);
                            const overlapPct = Number(prevWC?.overlap_percentage || settings.default_overlap_pct || 0);
                            // Units to finish: (Total Qty) * (1 - overlap%)
                            // We must finish at least 1 unit + setup
                            const unitsToFinish = Math.max(1, remaining * (1 - (overlapPct / 100)));
                            minStart = prevOpStart + (prevOpSetup + (prevOpRunPerUnit * unitsToFinish)) * 60 * 1000;
                        }

                        // ── TOC Drum-Buffer-Rope ───────────────────────────────────────────
                        // El TOC real protege al CCR (recurso más cargado) con un buffer
                        // de tiempo ANTES de su operación para que nunca sufra hambruna.
                        // El buffer es de tocBufferMs (calculado pre-simulación por ratio
                        // real de carga). Solo aplica si:
                        //   a) El modo es TOC Optimized + DBR
                        //   b) Este WC es el CCR real (no "cualquiera con 1 máquina")
                        //   c) Hay un buffer real que proteger (ccrRatio >= 50%)
                        //   d) No es la primera operación de la WO (la primera sigue ASAP)
                        if (settings.scheduling_mode === 'TOC Optimized'
                            && settings.bottleneck_management === 'Drum-Buffer-Rope'
                            && route.work_center_id === ccrWcId
                            && tocBufferMs > 0
                            && rIdx > 0) {
                            // Buffer before the CCR: ensures the CCR always has work
                            // waiting (never starved). The buffer absorbs upstream variability.
                            minStart = nextStepMinStart + tocBufferMs;
                        }
                        // ─────────────────────────────────────────────────────────────────

                        // Adjust duration based on work center efficiency for initial slot finding
                        const opDurForSubLot = ((setup + (runPerUnit * qtyForThisMachine)) / wcEfficiency) * 60 * 1000;
                        const actualStart = findEarliestSlot(chosenM, minStart, opDurForSubLot);
                        const machineData = machines.find(m => m.id === chosenM);
                        const finalEfficiency = Number(machineData?.efficiency_factor || wcEfficiency);
                        const actE = addWorkingTime(actualStart, ((setup + (runPerUnit * qtyForThisMachine)) / finalEfficiency) * 60 * 1000, machineData?.shift);

                        proposedOperations.push({
                            work_order_id: ref.replace('WO-', ''),
                            operation_sequence: route.operation_sequence,
                            item_id: itemId,
                            machine_id: chosenM,
                            work_center_id: route.work_center_id,
                            start_date: toISO(actualStart),
                            end_date: toISO(actE),
                            setup_time_minutes: setup,
                            run_time_minutes: runPerUnit * qtyForThisMachine,
                            quantity: qtyForThisMachine,
                            is_locked: !!isLocked
                        });

                        if (!isLocked) {
                            machineOccupancy[chosenM].push({ start: actualStart, end: actE, type: 'PROPOSED_OP' });
                            machineOccupancy[chosenM].sort((a, b) => a.start - b.start);
                        }

                        operationEndDates.push(actE);
                        leftToDistribute -= qtyForThisMachine;

                        // Tracking for next step overlap (approximate with first machine's operation in a split)
                        if (i === 0) {
                            prevOpStart = actualStart;
                            prevOpSetup = setup;
                            prevOpRunPerUnit = runPerUnit;
                        }
                    }

                    nextStepMinStart = Math.max(...operationEndDates);
                });

                const finalDate = nextStepMinStart;
                if (maxCompReady > SIM_START_MS) currentReason = componentReason === 'none' ? 'supply' : componentReason;
                itemStockEvents[itemId].push({ date: toISO(finalDate), type: 'PRODUCTION', delta: remaining, ref: isRoot ? `Termino ${ref}` : `Reponer Stock`, priority: 1 });
                itemStockEvents[itemId].push({ date: toISO(finalDate), type: 'CONSUMPTION', delta: -remaining, ref: `${ref}`, priority: 2 });

                let delay = 0; let sev = 'green';
                if (requestedDate > 0 && finalDate > requestedDate) {
                    delay = Math.ceil((finalDate - requestedDate) / (1000 * 60 * 60 * 24));
                    sev = 'red';
                }
                proposedWorkOrders.push({ item_id: itemId, work_order_id: isRoot ? ref.replace('WO-', '') : null, quantity: remaining, start_date: toISO(maxCompReady), end_date: toISO(finalDate), due_date: isRoot ? toISO(requestedDate) : null, delay_days: delay, severity: sev, status: 'proposed', action_type: isRoot ? 'new' : 'reponer' });
                if (ref) plannedDemand.set(ref + itemId, finalDate);
                return { readyDate: finalDate, reason: currentReason };
            } else {
                const erpPO = erpPurchases.find(po => po.item_id === itemId && !po.is_fixed);
                let leadTime = Number(item?.lead_time_days) || 7;

                // Reprovision Policy Logic
                if (settings.reprovision_policy === 'TOC Replenishment') {
                    leadTime = Math.max(1, Math.ceil(leadTime * 0.4)); // 60% reduction assuming buffer availability
                } else if (settings.reprovision_policy === 'Stock-to-Order') {
                    leadTime = Math.ceil(leadTime * 1.5); // 50% increase due to no-stock policy
                }

                const possibleTs = SIM_START_MS + (leadTime * 24 * 60 * 60 * 1000);
                proposedPurchaseOrders.push({ item_id: itemId, quantity: remaining, delivery_date: toISO(possibleTs), erp_ref_id: erpPO?.id, change_type: erpPO ? 'reprogram' : 'new', status: 'suggested' });
                itemStockEvents[itemId].push({ date: toISO(possibleTs), type: 'PURCHASE', delta: remaining, ref: `Abastecimiento (${settings.reprovision_policy || 'MRP'})`, priority: 1 });
                itemStockEvents[itemId].push({ date: toISO(possibleTs), type: 'CONSUMPTION', delta: -remaining, ref: `${ref} (Comprado)`, priority: 2 });
                return { readyDate: possibleTs, reason: 'supply' };
            }
        };

        // MEJORA 1: Ordenar WOs por fecha de entrega (primario) y por prioridad (desempate).
        // Prioridad 1 = más urgente (se planifica antes cuando comparten due_date).
        // MEJORA 2: Excluir WOs canceladas o en pausa del proceso de planificación.
        const STATUSES_TO_SKIP = new Set(['Cancelled', 'Canceled', 'On Hold', 'Cerrada', 'Cancelada']);

        workOrders
            .filter(o => !STATUSES_TO_SKIP.has(o.status || ''))
            .sort((a, b) => {
                const dateA = new Date(a.due_date).getTime();
                const dateB = new Date(b.due_date).getTime();
                if (dateA !== dateB) return dateA - dateB;          // Primero: fecha más cercana
                return (a.priority ?? 99) - (b.priority ?? 99);    // Desempate: menor número = más urgente
            })
            .forEach(o => {
                const ordered = Number(o.quantity_ordered || 0);
                const completed = Number(o.quantity_completed || 0);
                const balance = Math.max(0, ordered - completed);

                // Solo planificar si hay un saldo pendiente
                if (balance > 0) {
                    fulfillDemand(o.item_id, balance, new Date(o.due_date).getTime(), `WO-${o.id}`, true);
                }
            });

        // ─────────────────────────────────────────────────────────────────────
        // SAFETY STOCK PROACTIVE REPLENISHMENT PASS
        // ─────────────────────────────────────────────────────────────────────
        const HORIZON_DAYS = 90;
        const HORIZON_MS = SIM_START_MS + HORIZON_DAYS * 24 * 60 * 60 * 1000;
        const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
        // FIX: límite de reposiciones por artículo para evitar loops (lead_time=0, stock irrecuperable)
        const MAX_REPLENISHMENTS_PER_ITEM = 12;
        const replenishmentCount: Record<string, number> = {};

        items.forEach(it => {
            const safetyStock = Number((it as any).safety_stock || 0);
            if (safetyStock <= 0) return; // No safety stock configured — skip

            const leadTimeDays = Number(it.lead_time_days || 7);
            const leadTimeMs = leadTimeDays * 24 * 60 * 60 * 1000;
            const itemType: string = (it as any).item_type || 'COMPRADO';
            const isBought = itemType === 'COMPRADO';
            const minReplenishQty = Number((it as any).min_purchase_qty || 1);

            // Sort existing events by date (ascending) to project cumulative stock
            const sortedEvents = [...(itemStockEvents[it.id] || [])].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Walk the planning horizon day by day and find first breach
            let checkTs = SIM_START_MS;
            while (checkTs <= HORIZON_MS) {
                // Calculate projected stock at checkTs
                const projectedStock = sortedEvents
                    .filter(e => new Date(e.date).getTime() <= checkTs)
                    .reduce((acc, e) => acc + e.delta, 0);

                if (projectedStock < safetyStock) {
                    // Stock breach detected at checkTs
                    const qtyToReplenish = Math.max(minReplenishQty, safetyStock - projectedStock);

                    if (isBought) {
                        // For purchased items: we need to place the PO lead_time_days BEFORE the breach
                        const orderPlacedTs = Math.max(SIM_START_MS, checkTs - leadTimeMs);
                        const deliveryTs = orderPlacedTs + leadTimeMs;

                        // Check we haven't already covered this window with a safety stock PO
                        const alreadyCovered = proposedPurchaseOrders.some(
                            po => po.item_id === it.id &&
                                po.action_type === 'safety_stock' &&
                                Math.abs(new Date(po.delivery_date).getTime() - deliveryTs) < CHECK_INTERVAL_MS * 3
                        );

                        if (!alreadyCovered && (replenishmentCount[it.id] || 0) < MAX_REPLENISHMENTS_PER_ITEM) {
                            replenishmentCount[it.id] = (replenishmentCount[it.id] || 0) + 1;
                            const erpPO = erpPurchases.find(po => po.item_id === it.id && !po.is_fixed);
                            proposedPurchaseOrders.push({
                                item_id: it.id,
                                quantity: qtyToReplenish,
                                delivery_date: toISO(deliveryTs),
                                erp_ref_id: erpPO?.id || null,
                                change_type: erpPO ? 'reprogram' : 'new',
                                status: 'suggested',
                                action_type: 'safety_stock', // marker so UI can differentiate
                            });
                            // Register the incoming stock so subsequent checks see it
                            itemStockEvents[it.id].push({
                                date: toISO(deliveryTs),
                                type: 'PURCHASE_SAFETY',
                                delta: qtyToReplenish,
                                ref: `Reposición Stock Seguridad (SS=${safetyStock})`,
                                priority: 1,
                            });
                            // Re-sort after adding new event
                            sortedEvents.push({ date: toISO(deliveryTs), delta: qtyToReplenish });
                            sortedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        }
                    } else {
                        // For manufactured items: use fulfillDemand (creates PWO + operations)
                        const alreadyCovered = proposedWorkOrders.some(
                            wo => wo.item_id === it.id &&
                                wo.action_type === 'safety_stock' &&
                                Math.abs(new Date(wo.due_date || wo.end_date).getTime() - checkTs) < CHECK_INTERVAL_MS * 3
                        );

                        if (!alreadyCovered && (replenishmentCount[it.id] || 0) < MAX_REPLENISHMENTS_PER_ITEM) {
                            replenishmentCount[it.id] = (replenishmentCount[it.id] || 0) + 1;
                            const result = fulfillDemand(it.id, qtyToReplenish, checkTs, `SS-${it.id}-${checkTs}`, false);
                            // Mark last added PWO as safety_stock type
                            const lastWO = proposedWorkOrders[proposedWorkOrders.length - 1];
                            if (lastWO && lastWO.item_id === it.id) {
                                lastWO.action_type = 'safety_stock';
                                lastWO.due_date = toISO(checkTs);
                                // Register incoming production stock
                                sortedEvents.push({ date: toISO(result.readyDate), delta: qtyToReplenish });
                                sortedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            }
                        }
                    }

                    // Jump forward past the replenishment delivery to avoid duplicate triggers
                    checkTs += leadTimeMs + CHECK_INTERVAL_MS;
                } else {
                    // Stock is OK at this date — advance one day
                    checkTs += CHECK_INTERVAL_MS;
                }
            }
        });
        // ─── End Safety Stock Pass ───────────────────────────────────────────

        const finalSF: Record<string, any[]> = {};
        Object.keys(itemStockEvents).forEach(id => {
            let b = 0;
            finalSF[id] = itemStockEvents[id]
                .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime() || x.priority - y.priority)
                .map(e => {
                    b += e.delta;
                    // FIX: NO enmascarar stock negativo. El valor negativo es
                    // información crítica (rotura de stock) que la UI debe
                    // mostrar en rojo. isStockout=true es la señal para la UI.
                    return { ...e, total: b, isStockout: b < 0 };
                });
        });

        // Compute Metrics
        const targetWOs = proposedWorkOrders.filter(wo => wo.due_date);
        const onTimeCount = targetWOs.filter(wo => wo.delay_days <= 0).length;
        const totalWO = targetWOs.length;

        // Lead Time Average (in days)
        let totalLeadTimeDays = 0;
        proposedWorkOrders.forEach(wo => {
            const start = new Date(wo.start_date).getTime();
            const end = new Date(wo.end_date).getTime();
            totalLeadTimeDays += (end - start) / (1000 * 60 * 60 * 24);
        });
        const avgLT = proposedWorkOrders.length ? totalLeadTimeDays / proposedWorkOrders.length : 0;

        // Makespan (Total hours from first op to last op)
        const allOpTimes = proposedOperations.flatMap(op => [new Date(op.start_date).getTime(), new Date(op.end_date).getTime()]);
        const minOp = allOpTimes.length ? Math.min(...allOpTimes) : SIM_START_MS;
        const maxOp = allOpTimes.length ? Math.max(...allOpTimes) : SIM_START_MS;
        const makespanHours = (maxOp - minOp) / (1000 * 60 * 60);

        // Construir lista de cuellos de botella ordenados por ratio (para la UI)
        const bottlenecks = Object.keys(wcLoad)
            .filter(wcId => wcLoad[wcId] > 0)
            .map(wcId => ({
                work_center_id: wcId,
                work_center_name: workCenters.find(w => w.id === wcId)?.name || wcId,
                load_minutes: Math.round(wcLoad[wcId]),
                capacity_minutes: Math.round(wcCapacity[wcId] || 0),
                utilization_ratio: wcLoad[wcId] / (wcCapacity[wcId] || 1),
                is_ccr: wcId === ccrWcId
            }))
            .sort((a, b) => b.utilization_ratio - a.utilization_ratio);

        return {
            proposedWorkOrders, proposedPurchaseOrders, proposedOperations, proposedMaintenance: maintenancePlans || [], bottlenecks, stockFlow: finalSF,
            metrics: {
                avgLeadTime: avgLT,
                onTimeDeliveryRate: totalWO ? (onTimeCount / totalWO) * 100 : 0,
                totalMakespanHours: makespanHours
            }
        };
    },

    async runSimulation(scenarioId: string, onProgress?: (percent: number) => void): Promise<APSResult> {
        try {
            console.log("APS Engine [START]:", scenarioId);
            if (onProgress) onProgress(5);

            const [
                { data: itemsRaw }, { data: bomRaw }, { data: routingsRaw },
                { data: scenario }, { data: machinesRaw }, { data: workOrdersRaw },
                { data: erpPurchaseOrders }, { data: existingOps },
                { data: maintenancePlans }, { data: workCenters }
            ] = await Promise.all([
                supabase.from('items').select('*'),
                supabase.from('bom').select('*'),
                supabase.from('routings').select('*'),
                supabase.from('scenarios').select('*').eq('id', scenarioId).single(),
                supabase.from('machines').select('*, shift:shifts(*)'),
                supabase.from('work_orders').select('*'),
                supabase.from('erp_purchase_orders').select('*'),
                supabase.from('proposed_operations').select('*').eq('scenario_id', scenarioId),
                supabase.from('maintenance_plans').select('*'),
                supabase.from('work_centers').select('*')
            ]);

            const settings = scenario || { simulation_overrides: {} };

            // Run Calculation
            const result = this.calculateAPS({
                items: itemsRaw || [],
                bom: bomRaw || [],
                routings: routingsRaw || [],
                machines: machinesRaw || [],
                workOrders: (workOrdersRaw || []) as WorkOrder[],
                erpPurchases: erpPurchaseOrders || [],
                existingOps: existingOps || [],
                maintenancePlans: maintenancePlans || [],
                workCenters: workCenters || [],
                settings
            });

            // Persistence
            if (onProgress) onProgress(80);
            await Promise.all([
                supabase.from('proposed_work_orders').delete().eq('scenario_id', scenarioId),
                supabase.from('proposed_purchase_orders').delete().eq('scenario_id', scenarioId),
                supabase.from('proposed_operations').delete().eq('scenario_id', scenarioId)
            ]);

            const pWOs = result.proposedWorkOrders.map(wo => ({ ...wo, scenario_id: scenarioId }));
            const pPOs = result.proposedPurchaseOrders.map(po => ({ ...po, scenario_id: scenarioId }));
            const pOps = result.proposedOperations.map(op => ({ ...op, scenario_id: scenarioId }));

            if (pWOs.length > 0) await supabase.from('proposed_work_orders').insert(pWOs);
            if (pPOs.length > 0) await supabase.from('proposed_purchase_orders').insert(pPOs);
            if (pOps.length > 0) await supabase.from('proposed_operations').insert(pOps);

            if (onProgress) onProgress(100);
            return result;
        } catch (error) {
            console.error("APS ERROR:", error);
            throw error;
        }
    }
};
