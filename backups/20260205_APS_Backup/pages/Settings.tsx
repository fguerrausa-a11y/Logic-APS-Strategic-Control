
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { supabase } from '../services/supabaseClient';
import { useTranslation, languages } from '../services/languageService';

const ShiftSettings: React.FC = () => {
    const { t } = useTranslation();
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        const { data } = await supabase.from('shifts').select('*');
        if (data) setShifts(data);
        setLoading(false);
    };

    const addShift = async () => {
        const name = t('new_shift');
        const res = prompt(t('new_shift') + ':');
        if (!res) return;
        await supabase.from('shifts').insert([{
            name: res,
            start_time: '08:00',
            end_time: '17:00',
            days_of_week: [1, 2, 3, 4, 5]
        }]);
        fetchShifts();
    };

    const deleteShift = async (id: string) => {
        if (!confirm(t('delete_confirm_shift'))) return;
        await supabase.from('shifts').delete().eq('id', id);
        fetchShifts();
    };

    const [editingShift, setEditingShift] = useState<any | null>(null);

    const saveShift = async (shift: any) => {
        await supabase.from('shifts').upsert([shift]);
        setEditingShift(null);
        fetchShifts();
    };

    return (
        <div className="space-y-4 bg-[var(--bg-card)] p-6 rounded-[2rem] border border-[var(--border-color)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{t('work_shifts')}</h3>
                <button onClick={addShift} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> {t('new_shift')}
                </button>
            </div>
            <div className="grid gap-4">
                {shifts.map(s => (
                    <div key={s.id} className="p-4 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-4">
                        {editingShift?.id === s.id ? (
                            <div className="space-y-4">
                                <input
                                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-2 text-sm font-bold shadow-inner text-[var(--text-main)]"
                                    value={editingShift.name}
                                    onChange={e => setEditingShift({ ...editingShift, name: e.target.value })}
                                    placeholder={t('new_shift_placeholder')}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-black text-[var(--text-muted)]">{t('start')}</label>
                                        <input type="time" className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-2 text-xs font-bold text-[var(--text-main)]" value={editingShift.start_time} onChange={e => setEditingShift({ ...editingShift, start_time: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-black text-[var(--text-muted)]">{t('end')}</label>
                                        <input type="time" className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-2 text-xs font-bold text-[var(--text-main)]" value={editingShift.end_time} onChange={e => setEditingShift({ ...editingShift, end_time: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setEditingShift(null)} className="text-[10px] font-black uppercase text-[var(--text-muted)] px-3 py-2">{t('cancel')}</button>
                                    <button onClick={() => saveShift(editingShift)} className="text-[10px] font-black uppercase bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20">{t('save_changes')}</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">{s.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase font-black">{s.start_time} - {s.end_time} • {s.days_of_week?.length || 5} {t('days')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingShift(s)} className="text-indigo-400 hover:bg-indigo-500/10 p-2 rounded-xl transition-all">
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                    <button onClick={() => deleteShift(s.id)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-all">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {shifts.length === 0 && <p className="text-xs text-[var(--text-muted)] italic">{t('no_shifts_defined')}</p>}
            </div>
        </div>
    );
};

const MachineSettings: React.FC = () => {
    const { t } = useTranslation();
    const [machines, setMachines] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: m } = await supabase.from('machines').select('*, work_center:work_centers(name)');
            const { data: s } = await supabase.from('shifts').select('*');
            if (m) setMachines(m || []);
            if (s) setShifts(s || []);
        };
        init();
    }, []);

    const updateMachineShift = async (machineId: string, shiftId: string) => {
        setUpdating(machineId);
        await supabase.from('machines').update({ shift_id: shiftId === "" ? null : shiftId }).eq('id', machineId);
        setUpdating(null);
        // Re-fetch machines to update state
        const { data } = await supabase.from('machines').select('*, work_center:work_centers(name)');
        if (data) setMachines(data);
    };

    return (
        <div className="space-y-4">
            {machines.map(m => (
                <div key={m.id} className="flex flex-wrap items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <span className="material-symbols-outlined">precision_manufacturing</span>
                        </div>
                        <div>
                            <p className="font-bold text-[var(--text-main)]">{m.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{m.work_center?.name || 'S/C'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={m.shift_id || ''}
                            onChange={(e) => updateMachineShift(m.id, e.target.value)}
                            className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all min-w-[150px] text-[var(--text-main)]"
                        >
                            <option value="">{t('twenty_four_seven')}</option>
                            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {updating === m.id && <span className="material-symbols-outlined animate-spin text-indigo-400 text-sm">sync</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};


const WorkCenterSettings: React.FC = () => {
    const { t } = useTranslation();
    const [wcs, setWcs] = useState<any[]>([]);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchWCs();
    }, []);

    const fetchWCs = async () => {
        const { data } = await supabase.from('work_centers').select('*');
        if (data) setWcs(data);
    };

    const updateWC = async (id: string, overlapValue: number) => {
        setUpdating(id);
        await supabase.from('work_centers').update({ overlap_percentage: overlapValue }).eq('id', id);
        setUpdating(null);
    };

    return (
        <div className="space-y-4">
            {wcs.map(wc => (
                <div key={wc.id} className="flex flex-wrap items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <span className="material-symbols-outlined">precision_manufacturing</span>
                        </div>
                        <div>
                            <p className="font-bold text-[var(--text-main)]">{wc.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">ID: {wc.id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-1 w-48">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">{t('overlap')}</span>
                                <span className="text-xs font-bold text-indigo-400">{wc.overlap_percentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={wc.overlap_percentage || 0}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setWcs(wcs.map(w => w.id === wc.id ? { ...w, overlap_percentage: val } : w));
                                }}
                                onMouseUp={(e: any) => updateWC(wc.id, parseInt(e.target.value))}
                                className="accent-indigo-500 h-1"
                            />
                        </div>
                        {updating === wc.id && <span className="material-symbols-outlined animate-spin text-indigo-400 text-sm">sync</span>}
                    </div>
                </div>
            ))}
            {wcs.length === 0 && <p className="text-[var(--text-muted)] text-center py-4 italic text-sm">{t('no_wc_found')}</p>}
        </div>
    );
};

const SettingsPage: React.FC = () => {
    const { t, language, setLanguage } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        scheduling_mode: 'TOC Optimized',
        overlap_enabled: true,
        default_overlap_pct: 20,
        reprovision_policy: 'TOC Replenishment',
        bottleneck_management: 'Drum-Buffer-Rope',
        default_buffer_days: 2
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('aps_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setSettings(data);
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('aps_settings')
                .upsert({
                    user_id: user.id,
                    ...settings,
                    updated_at: new Date()
                });

            if (error) alert(t('error_save') + ': ' + error.message);
            else alert(t('success_save'));
        }
        setSaving(false);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] uppercase font-black tracking-widest">{t('loading_params')}</div>;

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] font-body transition-colors">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative text-[var(--text-main)]">
                <TopHeader title={t('aps_config_params')} icon="settings" />

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-[1000px] mx-auto space-y-10">

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <span className="material-symbols-outlined text-cyan-400 text-3xl">psychology</span>
                                <div>
                                    <h2 className="text-xl font-bold font-display">{t('engine_mode')}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{t('engine_desc')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('scheduling_modality')}</label>
                                    <select
                                        value={settings.scheduling_mode}
                                        onChange={(e) => setSettings({ ...settings, scheduling_mode: e.target.value })}
                                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-all text-[var(--text-main)]"
                                    >
                                        <option value="TOC Optimized">{t('toc_optimized')}</option>
                                        <option value="Forward ASAP">{t('forward_asap')}</option>
                                        <option value="Backward JIT">{t('backward_jit')}</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('bottleneck_mgmt')}</label>
                                    <select
                                        value={settings.bottleneck_management}
                                        onChange={(e) => setSettings({ ...settings, bottleneck_management: e.target.value })}
                                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-all text-[var(--text-main)]"
                                    >
                                        <option value="Drum-Buffer-Rope">{t('dbr_standard')}</option>
                                        <option value="Infinite Capacity">{t('infinite_capacity')}</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <span className="material-symbols-outlined text-amber-400 text-3xl">sync_alt</span>
                                <div>
                                    <h2 className="text-xl font-bold font-display">{t('sync_overlap')}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{t('sync_desc')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">{t('allow_overlap')}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{t('overlap_desc')}</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.overlap_enabled}
                                        onChange={(e) => setSettings({ ...settings, overlap_enabled: e.target.checked })}
                                        className="size-5 rounded border-[var(--border-color)] text-indigo-500 focus:ring-indigo-500 bg-[var(--bg-main)]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('default_overlap_pct')}</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={settings.default_overlap_pct}
                                            onChange={(e) => setSettings({ ...settings, default_overlap_pct: parseInt(e.target.value) })}
                                            className="flex-1 accent-indigo-500"
                                        />
                                        <span className="text-lg font-bold w-12 text-indigo-400">{settings.default_overlap_pct}%</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <span className="material-symbols-outlined text-emerald-400 text-3xl">inventory_2</span>
                                <div>
                                    <h2 className="text-xl font-bold font-display">{t('reprovision_policies')}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{t('reprovision_desc')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('inventory_policy')}</label>
                                    <select
                                        value={settings.reprovision_policy}
                                        onChange={(e) => setSettings({ ...settings, reprovision_policy: e.target.value })}
                                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-all text-[var(--text-main)]"
                                    >
                                        <option value="TOC Replenishment">{t('toc_replenishment')}</option>
                                        <option value="MRP Standard">{t('mrp_standard')}</option>
                                        <option value="Stock-to-Order">{t('stock_to_order')}</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('default_buffer_days')}</label>
                                    <input
                                        type="number"
                                        value={settings.default_buffer_days}
                                        onChange={(e) => setSettings({ ...settings, default_buffer_days: parseInt(e.target.value) })}
                                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-all text-[var(--text-main)]"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <span className="material-symbols-outlined text-indigo-400 text-3xl">language</span>
                                <div>
                                    <h2 className="text-xl font-bold font-display">{t('language')}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{t('select_language_desc')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('interface_language')}</label>
                                    <div className="relative group">
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value as any)}
                                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3.5 pl-12 text-sm focus:border-indigo-500 outline-none transition-all appearance-none text-[var(--text-main)] cursor-pointer"
                                        >
                                            {languages.map(lang => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                                            {languages.find(l => l.code === language)?.flag}
                                        </div>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                            <span className="material-symbols-outlined">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <span className="material-symbols-outlined text-indigo-400 text-3xl">schedule</span>
                                <div>
                                    <h2 className="text-xl font-bold font-display">{t('shift_mgmt')}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{t('shift_desc')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <ShiftSettings />
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">{t('machine_assignment')}</h3>
                                    <MachineSettings />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                                <span className="material-symbols-outlined text-purple-400 text-3xl">groups</span>
                                <div>
                                    <h2 className="text-xl font-bold font-display">{t('wc_params')}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">{t('wc_desc')}</p>
                                </div>
                            </div>

                            <WorkCenterSettings />
                        </section>

                        <div className="pt-10 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-500 px-10 py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">save</span>
                                {saving ? t('calculating') + '...' : t('save_config')}
                            </button>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
