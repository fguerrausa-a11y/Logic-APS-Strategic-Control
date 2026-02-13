export type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'zh';

export interface Translations {
    [key: string]: {
        [K in Language]: string;
    };
}
