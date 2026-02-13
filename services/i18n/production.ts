import { Translations } from './types';

export const production: Translations = {
    // Shifts
    'work_shifts': { es: 'Turnos de Trabajo', en: 'Work Shifts', fr: 'Équipes de Travail', de: 'Arbeitsschichten', pt: 'Turnos de Trabajo', zh: '工作班次' },
    'new_shift': { es: 'Nuevo Turno', en: 'New Shift', fr: 'Nouvelle Équipe', de: 'Neue Schicht', pt: 'Novo Turno', zh: '新班次' },
    'no_shifts': { es: 'No hay turnos definidos.', en: 'No shifts defined.', fr: 'Aucune équipe définie.', de: 'Keine Schichten definiert.', pt: 'Não há turnos definidos.', zh: '未定义班次。' },
    'no_wc_found': { es: 'No se encontraron centros de trabajo para configurar.', en: 'No work centers found to configure.', fr: 'Aucun centre de travail trouvé pour configurer.', de: 'Keine Arbeitsplätze zum Konfigurieren gefunden.', pt: 'Nenhum centro de trabalho encontrado para configurar.', zh: '未找到可配置的工作中心。' },
    'delete_confirm_shift': { es: '¿Eliminar este turno?', en: 'Delete this shift?', fr: 'Supprimer cette équipe ?', de: 'Diese Schicht löschen?', pt: 'Excluir este turno?', zh: '删除此班次？' },
    'overlap': { es: 'Solapamiento', en: 'Overlap', fr: 'Chevauchement', de: 'Überlappung', pt: 'Sobreposição', zh: '重叠' },
    'twenty_four_seven': { es: '24/7 (Sin Turno)', en: '24/7 (No Shift)', fr: '24/7 (Pas d\'Équipe)', de: '24/7 (Keine Schicht)', pt: '24/7 (Sem Turno)', zh: '24/7（无班次）' },

    // Load Analysis
    'wc_load_analysis': { es: 'Análisis de Carga de Centros', en: 'Work Center Load Analysis', fr: 'Analyse de Charge des Centres', de: 'Arbeitsplatz-Lastanalyse', pt: 'Análisis de Carga de Centros', zh: '工作中心负载分析' },
    'wc_loading': { es: 'Carga de Centros de Trabajo', en: 'Work Center Loading', fr: 'Charge des Centres de Travail', de: 'Arbeitsplatz-Auslastung', pt: 'Carga de Centros de Trabalho', zh: '工作中心负载' },
    'wc_load_desc': { es: 'Utilización de capacidad en tiempo real contra carga infinita.', en: 'Real-time capacity utilization against infinite load.', fr: 'Utilisation de la capacité en temps réel par rapport à la charge infinie.', de: 'Echtzeit-Kapazitätsauslastung gegenüber unendlicher Last.', pt: 'Utilização de capacidade em tiempo real contra carga infinita.', zh: '实时产能利用率与无限负载的对比。' },
    'overload': { es: 'SOBRECARGA', en: 'OVERLOAD', fr: 'SURCHARGE', de: 'ÜBERLAST', pt: 'SOBRECARGA', zh: '过载' },
    'eighty_cap': { es: '80% CAP', en: '80% CAP', fr: '80% CAP', de: '80% KAP', pt: '80% CAP', zh: '80% 产能' },
    'the_drum': { es: 'The Drum (Tambor)', en: 'The Drum (Tambor)', fr: 'Le Tambour', de: 'Die Trommel', pt: 'The Drum (Tambor)', zh: '鼓 (The Drum)' },
    'material_buffers': { es: 'Buffers de Material', en: 'Material Buffers', fr: 'Buffers de Matériel', de: 'Materialpuffer', pt: 'Buffers de Material', zh: '物料缓冲' },
    'low': { es: 'Bajo', en: 'Low', fr: 'Bas', de: 'Niedrig', pt: 'Baixo', zh: '低' },
    'healthy': { es: 'Saludable', en: 'Healthy', fr: 'Sain', de: 'Gesund', pt: 'Saudável', zh: '健康' },
    'critical': { es: 'Crítico', en: 'Critical', fr: 'Critique', de: 'Kritisch', pt: 'Crítico', zh: '关键' },

    // Buffers / DBM
    'inventory_buffers_title': { es: 'Buffers de Inventario', en: 'Inventory Buffers', fr: 'Buffers de Stock', de: 'Bestandspuffer', pt: 'Buffers de Inventário', zh: '库存缓冲' },
    'buffer_status_dbm': { es: 'Estado de Buffers (DBM)', en: 'Buffer Status (DBM)', fr: 'État des Buffers (DBM)', de: 'Buffer-Status (DBM)', pt: 'Status de Buffers (DBM)', zh: '缓冲状态 (DBM)' },
    'dbm_desc': { es: 'Monitoreo dinámico basado en Theory of Constraints (TOC).', en: 'Dynamic monitoring based on Theory of Constraints (TOC).', fr: 'Suivi dynamique basé sur la Théorie des Contraintes (TOC).', de: 'Dynamische Überwachung basierend auf Theory of Constraints (TOC).', pt: 'Monitoramento dinâmico baseado em Theory of Constraints (TOC).', zh: '基于约束理论 (TOC) 的动态监控。' },
    'reference': { es: 'Referencia', en: 'Reference', fr: 'Référence', de: 'Referenz', pt: 'Referência', zh: '参考' },
    'delivery': { es: 'Entrega', en: 'Delivery', fr: 'Livraison', de: 'Lieferung', pt: 'Entrega', zh: '交付' },
    'buffer_consumption': { es: 'Consumo de Buffer', en: 'Buffer Consumption', fr: 'Consommation du Buffer', de: 'Buffer-Verbrauch', pt: 'Consumo de Buffer', zh: '缓冲消耗' },
    'inventory_optimization': { es: 'Optimización de Inventario', en: 'Inventory Optimization', fr: 'Optimisation des Stocks', de: 'Bestandsoptimierung', pt: 'Otimização de Inventário', zh: '库存优化' },
    'opt_suggestion': {
        es: 'El sistema sugiere reducir el lote de compra en el ítem {item} para liberar {amount} de flujo de caja sin afectar el cumplimiento.',
        en: 'The system suggests reducing the purchase lot for item {item} to free up {amount} of cash flow without affecting compliance.',
        fr: 'Le système suggère de réduire le lot d\'achat pour l\'article {item} afin de libérer {amount} de flux de trésorerie sans affecter la conformité.',
        de: 'Das System schlägt vor, das Los für Artikel {item} zu reduzieren, um {amount} an Cashflow freizusetzen, ohne die Einhaltung zu beeinträchtigen.',
        pt: 'O sistema sugere reduzir o lote de compra no item {item} para liberar {amount} de fluxo de caixa sem afetar a conformidade.',
        zh: '系统建议减少物品 {item} 的采购批次，以在不影响合规性的情况下释放 {amount} 的现金流。'
    },

    // Extra
    'delete_simulation': { es: 'Eliminar Simulación', en: 'Delete Simulation', fr: 'Supprimer Simulation', de: 'Simulation Löschen', pt: 'Excluir Simulação', zh: '删除模拟' },
    'real_time_load': { es: 'Análisis de Carga en Tiempo Real', en: 'Real-time Load Analysis', fr: 'Analyse de Charge en Temps Réel', de: 'Echtzeit-Lastanalyse', pt: 'Análise de Carga em Tempo Real', zh: '实时负载分析' },
    'waiting_engine': { es: 'Esperando ejecución del motor estratégico...', en: 'Waiting for strategic engine execution...', fr: 'En attente de l\'exécution du moteur stratégique...', de: 'Warten auf die Ausführung der strategischen Engine...', pt: 'Aguardando ejecución do motor estratégico...', zh: '等待战略引擎执行...' },
    'data_sync': { es: 'Sincronización de Datos • Motor APS v5.3', en: 'Data Synchronization • APS Engine v5.3', fr: 'Synchronisation des Données • Moteur APS v5.3', de: 'Datensynchronisierung • APS-Engine v5.3', pt: 'Sincronização de Datos • Motor APS v5.3', zh: '数据同步 • APS 引擎 v5.3' },

    // Notificaciones
    'notifications': { es: 'Notificaciones', en: 'Notifications', fr: 'Notifications', de: 'Benachrichtigungen', pt: 'Notificações', zh: '通知' },
    'no_notifications': { es: 'No hay nuevas notificaciones', en: 'No new notifications', fr: 'Pas de nouvelles notifications', de: 'Keine neuen Benachrichtigungen', pt: 'Sem novas notificações', zh: '没有新通知' },
    'apply_changes': { es: 'Aplicar Cambios', en: 'Apply Changes', fr: 'Appliquer les Changements', de: 'Änderungen übernehmen', pt: 'Aplicar Alterações', zh: '应用更改' },
    'dismiss': { es: 'Descartar', en: 'Dismiss', fr: 'Rejeter', de: 'Verwerfen', pt: 'Descartar', zh: '驳回' },
};
