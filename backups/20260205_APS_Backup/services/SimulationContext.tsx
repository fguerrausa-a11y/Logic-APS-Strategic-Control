
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';

interface SimulationContextType {
    selectedScenarioId: string | null;
    setSelectedScenarioId: (id: string | null) => void;
    scenarios: any[];
    loadingScenarios: boolean;
    refreshScenarios: () => Promise<void>;
    deleteScenarios: (ids: string[]) => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(() => {
        return localStorage.getItem('selectedScenarioId');
    });
    const [scenarios, setScenarios] = useState<any[]>([]);
    const [loadingScenarios, setLoadingScenarios] = useState(true);

    const refreshScenarios = async () => {
        setLoadingScenarios(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setScenarios([]);
                setLoadingScenarios(false);
                return;
            }

            const { data } = await supabase
                .from('scenarios')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                setScenarios(data);
                if (data.length > 0 && !selectedScenarioId) {
                    setSelectedScenarioId(data[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching scenarios in context:', err);
        } finally {
            setLoadingScenarios(false);
        }
    };

    useEffect(() => {
        refreshScenarios();
    }, []);

    useEffect(() => {
        if (selectedScenarioId) {
            localStorage.setItem('selectedScenarioId', selectedScenarioId);
        } else {
            localStorage.removeItem('selectedScenarioId');
        }
    }, [selectedScenarioId]);

    const deleteScenarios = async (ids: string[]) => {
        if (ids.length === 0) return;
        try {
            const { error } = await supabase.from('scenarios').delete().in('id', ids);
            if (error) throw error;
            await refreshScenarios();
            if (selectedScenarioId && ids.includes(selectedScenarioId)) {
                setSelectedScenarioId(null);
            }
        } catch (err) {
            console.error('Error deleting scenarios:', err);
            throw err;
        }
    };

    return (
        <SimulationContext.Provider value={{
            selectedScenarioId,
            setSelectedScenarioId,
            scenarios,
            loadingScenarios,
            refreshScenarios,
            deleteScenarios
        }}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (context === undefined) {
        throw new Error('useSimulation must be used within a SimulationProvider');
    }
    return context;
};
