# ============================================================
# Antigravity Skills - Script de instalación global
# Ejecutar desde PowerShell: .\install-skills.ps1
# ============================================================

Write-Host ""
Write-Host "🚀 Instalando Skills de Antigravity..." -ForegroundColor Cyan
Write-Host ""

# --- obra/superpowers (workflow de desarrollo) ---
Write-Host "📦 [1/4] obra/superpowers..." -ForegroundColor Yellow
npx skills add obra/superpowers -y --global

# --- vercel-labs/agent-skills (React best practices) ---
Write-Host ""
Write-Host "📦 [2/4] vercel-labs/agent-skills..." -ForegroundColor Yellow
npx skills add vercel-labs/agent-skills -y --global

# --- supabase/agent-skills (Postgres best practices) ---
Write-Host ""
Write-Host "📦 [3/4] supabase/agent-skills..." -ForegroundColor Yellow
npx skills add supabase/agent-skills -y --global

# --- anthropics/skills (webapp-testing + frontend-design + más) ---
Write-Host ""
Write-Host "📦 [4/4] anthropics/skills..." -ForegroundColor Yellow
npx skills add anthropics/skills -y --global

Write-Host ""
Write-Host "✅ ¡Todos los skills instalados globalmente!" -ForegroundColor Green
Write-Host ""
Write-Host "Skills incluidos:"
Write-Host "  - writing-plans, verification-before-completion"
Write-Host "  - subagent-driven-development, brainstorming"
Write-Host "  - systematic-debugging, test-driven-development"
Write-Host "  - vercel-react-best-practices, web-design-guidelines"
Write-Host "  - supabase-postgres-best-practices"
Write-Host "  - webapp-testing, frontend-design"
Write-Host "  - + 20 skills adicionales"
Write-Host ""
Write-Host "Prerrequisito: tener Python instalado para webapp-testing." -ForegroundColor DarkGray
Write-Host "  pip install playwright" -ForegroundColor DarkGray
Write-Host "  python -m playwright install chromium" -ForegroundColor DarkGray
Write-Host ""
