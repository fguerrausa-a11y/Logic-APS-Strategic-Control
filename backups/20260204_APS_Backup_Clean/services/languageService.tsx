import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations } from './i18n/types';

import { common } from './i18n/common';
import { auth } from './i18n/auth';
import { simulation } from './i18n/simulation';
import { dashboard } from './i18n/dashboard';
import { explorer } from './i18n/explorer';
import { reports } from './i18n/reports';
import { alerts } from './i18n/alerts';
import { schedule } from './i18n/schedule';
import { settings } from './i18n/settings';
import { aiAnalyst } from './i18n/aiAnalyst';
import { production } from './i18n/production';

// Merge all translations into a single object
const translations: Translations = {
    ...common,
    ...auth,
    ...simulation,
    ...dashboard,
    ...explorer,
    ...reports,
    ...alerts,
    ...schedule,
    ...settings,
    ...production,
    ...aiAnalyst
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        return (localStorage.getItem('appLanguage') as Language) || 'es';
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const t = (key: string, params?: Record<string, any>): string => {
        let text = translations[key]?.[language] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                text = text.replace(`{${param}}`, params[param]);
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
