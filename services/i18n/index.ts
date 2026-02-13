import { Translations } from './types';
import { common } from './common';
import { auth } from './auth';
import { simulation } from './simulation';
import { dashboard } from './dashboard';
import { explorer } from './explorer';
import { reports } from './reports';
import { alerts } from './alerts';
import { schedule } from './schedule';
import { settings } from './settings';
import { production } from './production';
import { aiAnalyst } from './aiAnalyst';
import { loadAnalysis } from './loadAnalysis';
import { analytics } from './analytics';

export const fallbackTranslations: Translations = {
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
    ...aiAnalyst,
    ...loadAnalysis,
    ...analytics,
};

export * from './types';
