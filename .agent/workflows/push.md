---
description: Backup del proyecto en GitHub usando Git local para máxima fiabilidad.
---

Este workflow asegura que el estado actual del proyecto se resguarde en el repositorio oficial de control estratégico.

1. **Repositorio Destino:** `fguerrausa-a11y/Logic-APS-Strategic-Control`
2. **Rama:** `main`
3. **Método Sugerido:**
   ```powershell
   & "C:\Program Files\Git\bin\git.exe" add .
   & "C:\Program Files\Git\bin\git.exe" commit -m "Backup descriptivo"
   & "C:\Program Files\Git\bin\git.exe" push origin main
   ```

**Nota de Seguridad:**
- El archivo `.env.local` (llaves API) NO se sube por seguridad. Mantén tu copia externa actualizada.

