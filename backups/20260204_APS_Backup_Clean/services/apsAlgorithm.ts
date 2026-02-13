
import { supabase } from './supabaseClient';

export interface APSResult {
    proposedWorkOrders: any[];
    proposedPurchaseOrders: any[];
    proposedOperations: any[];
    proposedMaintenance: any[];
    bottlenecks: any[];
    stockFlow: Record<string, any[]>;
}

interface Item { id: string; name: string; current_stock?: number; lead_time_days?: number; }
interface BOM { parent_item_id: string; component_item_id: string; quantity_required: number; }
interface Routing { item_id: string; work_center_id: string; operation_sequence: number; setup_time_minutes: number; run_time_minutes_per_unit: number; }
interface Machine { id: string; name: string; work_center_id: string; shift?: { daily_capacity_hours: number }; }
interface WorkOrder { id: string; item_id: string; quantity_ordered: number; due_date: string; }

export const apsAlgorithm = {
    async runSimulation(scenarioId: string, onProgress?: (percent: number) => void): Promise<APSResult> {
        try {
            console.log("APS Engine [START]:", scenarioId);
            if (onProgress) onProgress(5);

            const [
                { data: itemsRaw }, { data: bomRaw }, { data: routingsRaw },
                { data: scenario }, { data: machinesRaw }, { data: workOrdersRaw },
                { data: erpPurchaseOrders }, { data: existingOps }
            ] = await Promise.all([
                supabase.from('items').select('*'),
                supabase.from('bom').select('*'),
                supabase.from('routings').select('*'),
                supabase.from('scenarios').select('*').eq('id', scenarioId).single(),
                supabase.from('machines').select('*, shift:shifts(*)'),
                supabase.from('work_orders').select('*'),
                supabase.from('erp_purchase_orders').select('*'),
                supabase.from('proposed_operations').select('*').eq('scenario_id', scenarioId)
            ]);

            const safeItems = (itemsRaw || []) as Item[];
            const safeBOM = (bomRaw || []) as BOM[];
            const safeRoutings = (routingsRaw || []) as Routing[];
            const safeWorkOrders = (workOrdersRaw || []) as WorkOrder[];
            const safeMachines = (machinesRaw || []) as Machine[];
            const safeERPPurchases = erpPurchaseOrders || [];

            // Filtros de Demanda
            const filters = scenario?.simulation_overrides?.filters || {};
            let targetOrders = [...safeWorkOrders];
            if (filters.orderIds?.length > 0) {
                const fIds = Array.isArray(filters.orderIds) ? filters.orderIds : String(filters.orderIds).split(',').map(id => id.trim());
                targetOrders = targetOrders.filter(o => fIds.includes(String(o.id)));
            }
            if (filters.toDate) {
                const limit = new Date(filters.toDate).getTime();
                targetOrders = targetOrders.filter(o => new Date(o.due_date).getTime() <= limit);
            }

            // Simulación Stock Inicial
            // Force simulation to start in March 2026
            const SIM_START = new Date("2026-03-01T08:00:00Z");
            const SIM_START_ISO = SIM_START.toISOString();
            const SIM_START_MS = SIM_START.getTime();

            const simulationStock: Record<string, number> = {};
            const itemStockEvents: Record<string, any[]> = {};
            safeItems.forEach(it => {
                simulationStock[it.id] = Number(it.current_stock || 0);
                itemStockEvents[it.id] = [{ date: SIM_START_ISO, type: 'INITIAL', delta: Number(it.current_stock || 0), ref: 'Stock Inicial', priority: 0 }];
            });

            // Registrar Compras ERP ya lanzadas en el flujo de stock
            const activeERPPurchases = [...safeERPPurchases];
            activeERPPurchases.forEach(po => {
                itemStockEvents[po.item_id] = itemStockEvents[po.item_id] || [];
                itemStockEvents[po.item_id].push({
                    date: po.expected_delivery_date,
                    type: 'PURCHASE_ERP',
                    delta: Number(po.quantity_ordered),
                    ref: `ERP PO ${po.id}`,
                    priority: 0.5, // Antes de producciones pero después de inicial
                    erp_id: po.id,
                    is_fixed: po.is_fixed || false
                });
            });


            // 1. Identificar Capacidad (Máquinas Simuladas)
            const machineOverrides = scenario?.simulation_overrides?.machine_counts || {};
            const simulatedMachines: any[] = [];

            // Aseguramos que TODOS los Work Centers tengan al menos sus máquinas originales si no hay override
            const allWCs = safeItems.reduce((acc: Set<string>, it) => {
                const rs = safeRoutings.filter(r => r.item_id === it.id);
                rs.forEach(r => acc.add(r.work_center_id));
                return acc;
            }, new Set<string>());

            // Combinamos overrides con reales para asegurar cobertura total
            const wcIds = Array.from(new Set([...Array.from(allWCs), ...Object.keys(machineOverrides)]));

            wcIds.forEach(wcId => {
                const realWCMachines = safeMachines.filter(m => m.work_center_id === wcId);
                const count = (machineOverrides as any)[wcId] !== undefined
                    ? Number((machineOverrides as any)[wcId])
                    : realWCMachines.length;

                for (let i = 0; i < count; i++) {
                    const realM = realWCMachines[i];
                    simulatedMachines.push({
                        id: realM ? realM.id : `v-mach-${wcId}-${i}`,
                        work_center_id: wcId,
                        name: realM ? realM.name : `Virtual ${i + 1} (${wcId})`,
                        is_virtual: !realM
                    });
                }
            });

            const proposedWorkOrders: any[] = [];
            const proposedPurchaseOrders: any[] = [];
            const proposedOperations: any[] = [];

            // Map of locked operations to pre-fill schedule
            const lockedOps = (existingOps || []).filter(o => o.is_locked);
            // Map of occupied intervals per machine to allow for gap filling
            const machineOccupancy: Record<string, { start: number, end: number }[]> = {};

            simulatedMachines.forEach(m => {
                machineOccupancy[m.id] = [];
                // Initialize with locked operations
                const myLocks = lockedOps.filter(lo => String(lo.machine_id) === String(m.id));
                myLocks.forEach(lock => {
                    machineOccupancy[m.id].push({
                        start: new Date(lock.start_date).getTime(),
                        end: new Date(lock.end_date).getTime()
                    });
                });
                machineOccupancy[m.id].sort((a, b) => a.start - b.start);
            });

            const toISO = (ts: number | string | Date) => new Date(ts).toISOString();

            /**
             * GAP FILLING LOGIC: Finds the earliest slot of 'duration' that doesn't overlap 
             * with existing occupancy. Currently uses a simple 1-minute buffer.
             */
            const findEarliestSlot = (machineId: string, minStart: number, durationMs: number): number => {
                let potentialStart = Math.max(Date.now(), minStart);
                const intervals = machineOccupancy[machineId] || [];

                // Sort intervals just in case
                intervals.sort((a, b) => a.start - b.start);

                for (const interval of intervals) {
                    const potentialEnd = potentialStart + durationMs;

                    // If my potential range is completely before this interval, I found my spot
                    if (potentialEnd <= interval.start) {
                        return potentialStart;
                    }

                    // If there's an overlap, I must jump to at least the end of this interval
                    if (potentialStart < interval.end) {
                        potentialStart = interval.end + 60000; // 1 minute buffer
                    }
                }

                return potentialStart;
            };

            /**
             * RECURSIVE SUPPLY LOGIC: Determines the availability date for an item based on 
             * stock, existing ERP purchases, or potential new production/purchase orders.
             * @returns { readyDate: number, reason: 'machine' | 'supply' | 'none' }
             */
            const fulfillDemand = (itemId: string, qtyNeeded: number, requestedDate: number, ref: string, isRoot = false): { readyDate: number, reason: string } => {
                const item = safeItems.find(i => i.id === itemId);
                let currentReason = 'none';

                // 1. Verificar Stock + Compras ERP existentes
                const eventsPrior = (itemStockEvents[itemId] || []).filter(e => new Date(e.date).getTime() <= requestedDate);
                const projectedAtDate = eventsPrior.reduce((acc, curr) => acc + curr.delta, 0);

                const fromStock = Math.min(qtyNeeded, projectedAtDate);
                if (fromStock > 0) {
                    itemStockEvents[itemId].push({
                        date: toISO(requestedDate),
                        type: 'CONSUMPTION',
                        delta: -fromStock,
                        ref: `${ref} (Stock/ERP)`,
                        priority: 3
                    });
                }

                const remaining = qtyNeeded - fromStock;
                if (remaining <= 0) {
                    if (isRoot) {
                        proposedWorkOrders.push({
                            scenario_id: scenarioId, item_id: itemId, work_order_id: ref.replace('WO-', ''),
                            quantity: qtyNeeded, start_date: SIM_START_ISO, end_date: SIM_START_ISO,
                            due_date: toISO(requestedDate), delay_days: 0, severity: 'green', delay_reason: 'A tiempo', status: 'proposed', action_type: 'stock'
                        });
                    }
                    return { readyDate: requestedDate, reason: 'none' };
                }

                const itemRoutings = safeRoutings.filter(r => r.item_id === itemId).sort((a, b) => a.operation_sequence - b.operation_sequence);

                if (itemRoutings.length > 0) {
                    // --- PRODUCCIÓN ---
                    let maxCompReady = SIM_START_MS;
                    let componentReason = 'none';
                    const components = safeBOM.filter(b => b.parent_item_id === itemId);
                    const woIdRel = ref.replace('WO-', '');

                    components.forEach(comp => {
                        const result = fulfillDemand(comp.component_item_id, (Number(comp.quantity_required) || 1) * remaining, requestedDate, ref);
                        if (result.readyDate > maxCompReady) {
                            maxCompReady = result.readyDate;
                            componentReason = result.reason === 'none' ? 'supply' : result.reason;
                        }
                    });

                    let curStart = maxCompReady;
                    let machineWaitTotal = 0;

                    itemRoutings.forEach(route => {
                        const mtrs = simulatedMachines.filter(m => m.work_center_id === route.work_center_id);

                        // Check if this operation sequence for this WO is already locked
                        const isLocked = lockedOps.find(lo => {
                            const dbWO = String(lo.work_order_id || '').replace('WO-', '');
                            const routeWO = String(woIdRel || '').replace('WO-', '');
                            return dbWO === routeWO && String(lo.operation_sequence) === String(route.operation_sequence);
                        });

                        let actS: number;
                        let dur: number;
                        let finalMachineId: string;

                        if (isLocked) {
                            actS = new Date(isLocked.start_date).getTime();
                            dur = new Date(isLocked.end_date).getTime() - actS;
                            finalMachineId = isLocked.machine_id;
                        } else {
                            // Find best machine (the one that can start earliest with gap filling)
                            let earliestPossible = Infinity;
                            let chosenM = mtrs[0]?.id;
                            const opDur = (Number(route.setup_time_minutes || 0) + (Number(route.run_time_minutes_per_unit || 0) * remaining)) * 60 * 1000;

                            mtrs.forEach(m => {
                                const bestForThisMachine = findEarliestSlot(m.id, curStart, opDur);
                                if (bestForThisMachine < earliestPossible) {
                                    earliestPossible = bestForThisMachine;
                                    chosenM = m.id;
                                }
                            });

                            actS = earliestPossible;
                            dur = opDur;
                            finalMachineId = chosenM;
                        }

                        const actE = actS + dur;

                        if (finalMachineId) {
                            proposedOperations.push({
                                scenario_id: scenarioId,
                                work_order_id: isLocked ? isLocked.work_order_id : woIdRel,
                                operation_sequence: route.operation_sequence,
                                item_id: itemId,
                                machine_id: finalMachineId,
                                work_center_id: route.work_center_id,
                                start_date: toISO(actS),
                                end_date: toISO(actE),
                                setup_time_minutes: isLocked ? isLocked.setup_time_minutes : Number(route.setup_time_minutes || 0),
                                run_time_minutes: isLocked ? isLocked.run_time_minutes : Number(route.run_time_minutes_per_unit || 0) * remaining,
                                quantity: remaining,
                                is_locked: !!isLocked
                            });

                            // Update occupancy for this machine
                            if (!isLocked) {
                                machineOccupancy[finalMachineId].push({ start: actS, end: actE });
                                machineOccupancy[finalMachineId].sort((a, b) => a.start - b.start);
                            }

                            curStart = actE;
                        }
                    });

                    const finalDate = curStart;
                    const durationInMachine = finalDate - maxCompReady;

                    // Lógica de causa raíz: Si esperamos más por componentes que por máquinas
                    const supplyWait = maxCompReady - Date.now();
                    if (machineWaitTotal > 0 && machineWaitTotal > supplyWait) {
                        currentReason = 'machine';
                    } else if (maxCompReady > Date.now()) {
                        currentReason = componentReason === 'none' ? 'supply' : componentReason;
                    }

                    itemStockEvents[itemId].push({ date: toISO(finalDate), type: 'PRODUCTION', delta: remaining, ref: isRoot ? `Termino ${woIdRel}` : `Reponer Stock`, priority: 1 });
                    itemStockEvents[itemId].push({ date: toISO(finalDate), type: 'CONSUMPTION', delta: -remaining, ref: isRoot ? `Final ${ref}` : `${ref} (Fabricado)`, priority: 2 });

                    let delay = 0; let sev = 'green'; let reasonText = 'A tiempo';
                    if (requestedDate > 0 && finalDate > requestedDate) {
                        delay = Math.ceil((finalDate - requestedDate) / (1000 * 60 * 60 * 24));
                        sev = 'red';
                        reasonText = currentReason === 'machine' ? 'Saturación de Máquinas (Cuellos de Botella)' : 'Lead Time de Suministros (Materiales)';
                    }

                    proposedWorkOrders.push({
                        scenario_id: scenarioId, item_id: itemId, work_order_id: isRoot ? woIdRel : null,
                        quantity: remaining, start_date: toISO(maxCompReady), end_date: toISO(finalDate),
                        due_date: isRoot ? toISO(requestedDate) : null, delay_days: delay, severity: sev, delay_reason: reasonText,
                        status: 'proposed', action_type: isRoot ? 'new' : 'reponer'
                    });

                    return { readyDate: finalDate, reason: currentReason };
                } else {
                    // --- COMPRA ---
                    const erpPO = safeERPPurchases.find(po => po.item_id === itemId && !po.is_fixed);
                    const leadTime = Number(item?.lead_time_days) || 7;
                    const possibleTs = Date.now() + (leadTime * 24 * 60 * 60 * 1000);

                    if (erpPO) {
                        const originalDateTs = new Date(erpPO.expected_delivery_date).getTime();
                        proposedPurchaseOrders.push({
                            scenario_id: scenarioId, item_id: itemId, quantity: remaining,
                            delivery_date: toISO(possibleTs), original_delivery_date: toISO(originalDateTs),
                            erp_ref_id: erpPO.id, change_type: 'reprogram', status: 'suggested'
                        });
                    } else {
                        proposedPurchaseOrders.push({
                            scenario_id: scenarioId, item_id: itemId, quantity: remaining,
                            delivery_date: toISO(possibleTs), order_date: new Date().toISOString(), change_type: 'new', status: 'suggested'
                        });
                    }

                    itemStockEvents[itemId].push({ date: toISO(possibleTs), type: 'PURCHASE', delta: remaining, ref: `Abastecimiento`, priority: 1 });
                    itemStockEvents[itemId].push({ date: toISO(possibleTs), type: 'CONSUMPTION', delta: -remaining, ref: `${ref} (Comprado)`, priority: 2 });

                    return { readyDate: possibleTs, reason: 'supply' };
                }
            };

            targetOrders
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .forEach(o => fulfillDemand(o.item_id, Number(o.quantity_ordered || 1), new Date(o.due_date).getTime(), `WO-${o.id}`, true));

            // StockFlow Consolidado
            const finalSF: Record<string, any[]> = {};
            Object.keys(itemStockEvents).forEach(id => {
                let b = 0;
                finalSF[id] = itemStockEvents[id]
                    .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime() || x.priority - y.priority)
                    .map(e => { b += e.delta; return { ...e, total: Math.max(0, b) }; });
            });

            // Limpieza e Inserción
            await Promise.all([
                supabase.from('proposed_work_orders').delete().eq('scenario_id', scenarioId),
                supabase.from('proposed_purchase_orders').delete().eq('scenario_id', scenarioId),
                supabase.from('proposed_operations').delete().eq('scenario_id', scenarioId)
            ]);

            if (proposedWorkOrders.length > 0) await supabase.from('proposed_work_orders').insert(proposedWorkOrders);
            if (proposedPurchaseOrders.length > 0) await supabase.from('proposed_purchase_orders').insert(proposedPurchaseOrders);
            if (proposedOperations.length > 0) await supabase.from('proposed_operations').insert(proposedOperations);

            if (onProgress) onProgress(100);
            return { proposedWorkOrders, proposedPurchaseOrders, proposedOperations, proposedMaintenance: [], bottlenecks: [], stockFlow: finalSF };
        } catch (error) {
            console.error("APS ERROR:", error);
            throw error;
        }
    }
};
