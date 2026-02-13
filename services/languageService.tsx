import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { Language, Translations, fallbackTranslations } from './i18n';


interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, any>) => string;
    refreshTranslations: () => Promise<void>;
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        return (localStorage.getItem('appLanguage') as Language) || 'es';
    });

    const [translations, setTranslations] = useState<Translations>(() => {
        const cached = localStorage.getItem('app_translations');
        return cached ? JSON.parse(cached) : fallbackTranslations;
    });

    const [isLoading, setIsLoading] = useState(false);

    const refreshTranslations = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_translations')
                .select('*');

            if (data && !error) {
                const transformed: Translations = {};
                data.forEach((row: any) => {
                    const { key, created_at, updated_at, ...langs } = row;
                    transformed[key] = langs;
                });

                // Merge fallback with remote to ensure no keys are missing if DB is incomplete
                const merged = { ...fallbackTranslations, ...transformed };
                setTranslations(merged);
                localStorage.setItem('app_translations', JSON.stringify(merged));
                console.log('Translations synced from Supabase');
            }
        } catch (err) {
            console.error('Failed to sync translations:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    useEffect(() => {
        refreshTranslations();
    }, []);

    const t = (key: string, params?: Record<string, any>): string => {
        let text = translations[key]?.[language] || fallbackTranslations[key]?.[language] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                text = text.replace(`{${param}}`, params[param]);
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, refreshTranslations, isLoading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};

export const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export type { Language };
