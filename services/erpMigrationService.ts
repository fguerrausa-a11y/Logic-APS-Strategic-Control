
import { supabase } from './supabaseClient';

export interface ERPMapping {
    erp_field: string;
    supabase_field: string;
}

export interface ERPConfig {
    endpoint: string;
    apiKey?: string;
    headers?: Record<string, string>;
    mapping: Record<string, string>; // Maps ERP field names to Supabase column names
}

export const erpMigrationService = {
    /**
     * Fetches data from a specific ERP endpoint and migrates it to a Supabase table.
     */
    async migrateTable(targetTable: string, config: ERPConfig) {
        try {
            console.log(`Starting migration for ${targetTable}...`);

            const response = await fetch(config.endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
                    ...config.headers
                }
            });

            if (!response.ok) {
                throw new Error(`ERP API error: ${response.statusText}`);
            }

            const erpData = await response.json();

            // Handle different JSON structures (if it's an array or wrapped in an object)
            const dataArray = Array.isArray(erpData) ? erpData : erpData.data || erpData.records || [];

            if (dataArray.length === 0) {
                return { success: true, count: 0, message: 'No data found in ERP' };
            }

            // Map ERP data to Supabase schema
            const mappedData = dataArray.map((record: any) => {
                const mappedRecord: any = {};
                for (const [erpField, supabaseField] of Object.entries(config.mapping)) {
                    mappedRecord[supabaseField] = record[erpField];
                }
                return mappedRecord;
            });

            // Upsert into Supabase
            const { data, error } = await supabase
                .from(targetTable)
                .upsert(mappedData, { onConflict: 'id' }); // 'id' should be the primary key or unique identifier from ERP

            if (error) throw error;

            return { success: true, count: mappedData.length, message: `Successfully migrated ${mappedData.length} records to ${targetTable}.` };
        } catch (error: any) {
            console.error(`Migration failed for ${targetTable}:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Executes a full migration of all configured tables.
     */
    async migrateAll(configs: Record<string, ERPConfig>) {
        const results: Record<string, any> = {};
        for (const [table, config] of Object.entries(configs)) {
            results[table] = await this.migrateTable(table, config);
        }
        return results;
    }
};
