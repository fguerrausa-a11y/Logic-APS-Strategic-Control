---
description: Backup del proyecto en GitHub usando el repositorio vinculado mediante MCP.
---

Este workflow asegura que el estado actual del proyecto se guarde en la ubicación correcta de GitHub.

1. **Repositorio Destino:** `fguerrausa-a11y/Logic-APS`
2. **Rama:** `main`
3. **Herramienta:** `mcp_github-mcp-server_push_files`

**Archivos Críticos a Mantener Sincronizados:**
- `pages/` (Todas las vistas)
- `services/` (Lógica del APS y algoritmos)
- `components/` (UI Maestros)
- `scripts/` (Utilidades y sembrados)
- `package.json`, `index.tsx`, `App.tsx`, `index.css`
