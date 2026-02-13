
const MODALITIES = ['TOC Optimized', 'Forward ASAP', 'Backward JIT'];
const BOTTLENECK_MGMT = ['Drum-Buffer-Rope', 'Infinite Capacity'];
const REPROVISION_POLICIES = ['TOC Replenishment', 'MRP Standard', 'Stock-to-Order'];
const OVERLAP_OPTIONS = [true, false];

function simulateCombo(config) {
    let baseTime = (60 + 120 + 30) + (10 + 30 + 5) * 10;
    let makespanMinutes = baseTime;
    let latenessDays = 0;
    let riskFactor = 0;

    if (config.scheduling_mode === 'Forward ASAP') makespanMinutes *= 1.0;
    if (config.scheduling_mode === 'Backward JIT') {
        makespanMinutes *= 1.1;
        riskFactor += 0.2;
    }
    if (config.scheduling_mode === 'TOC Optimized') makespanMinutes *= 0.95;

    if (config.bottleneck_management === 'Infinite Capacity') makespanMinutes *= 0.7;
    else makespanMinutes *= 1.2;

    if (config.overlap_enabled) makespanMinutes *= 0.8;

    const simStartDate = new Date('2026-03-01T08:00:00Z');
    const endDate = new Date(simStartDate.getTime() + makespanMinutes * 60000);
    const dueDate = new Date('2026-03-15T17:00:00Z');

    if (endDate > dueDate) {
        latenessDays = (endDate - dueDate) / (1000 * 60 * 60 * 24);
    }

    return {
        makespan: (makespanMinutes / 60).toFixed(1) + 'h',
        lateness: latenessDays.toFixed(1) + 'd',
        risk: (riskFactor * 100).toFixed(0) + '%'
    };
}

console.log('| # | Modality | Bottleneck | Policy | Overlap | Makespan | Lateness | Risk |');
console.log('|---|---|---|---|---|---|---|---|');

let count = 1;
MODALITIES.forEach(mode => {
    BOTTLENECK_MGMT.forEach(bm => {
        REPROVISION_POLICIES.forEach(policy => {
            OVERLAP_OPTIONS.forEach(overlap => {
                const config = {
                    scheduling_mode: mode,
                    bottleneck_management: bm,
                    reprovision_policy: policy,
                    overlap_enabled: overlap
                };
                const res = simulateCombo(config);
                console.log(`| ${count} | ${mode} | ${bm} | ${policy.split(' ')[0]} | ${overlap ? 'ON' : 'OFF'} | ${res.makespan} | ${res.lateness} | ${res.risk} |`);
                count++;
            });
        });
    });
});
