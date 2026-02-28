
import { test } from '@playwright/test';
import path from 'path';

test('capture screenshots', async ({ page }) => {
    console.log('Navegando a la App...');
    await page.goto('http://localhost:3000/#/');

    // Esperar a que la app cargue
    await page.waitForTimeout(3000);

    // Seleccionar Escenario
    console.log('Seleccionando escenario...');
    const selector = page.locator('text=Seleccionar Simulación').first();
    await selector.click();
    await page.waitForTimeout(1000);

    // Click en el primer escenario de la lista
    // Ajustamos el selector para que sea más robusto
    const firstScenario = page.locator('div[class*="rounded-xl"]').nth(2); // Usualmente los items tienen esta clase
    await firstScenario.click();

    console.log('Esperando carga de datos...');
    await page.waitForTimeout(5000); // El Gantt y los KPIs tardan unos segundos

    const assetsPath = 'c:/Users/fg/OneDrive/Proyectos Antigravity/APS/public/docs/assets';

    // Screenshots
    console.log('Capturando Dashboard...');
    await page.goto('http://localhost:3000/#/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(assetsPath, 'dashboard.png'), fullPage: false });

    console.log('Capturando Carga de Centros...');
    await page.goto('http://localhost:3000/#/load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(assetsPath, 'load_analysis.png'), fullPage: false });

    console.log('Capturando Simulación...');
    await page.goto('http://localhost:3000/#/simulation');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(assetsPath, 'simulation.png'), fullPage: false });

    console.log('Capturando Gantt...');
    await page.goto('http://localhost:3000/#/schedule');
    await page.waitForTimeout(5000); // El Gantt es pesado
    await page.screenshot({ path: path.join(assetsPath, 'schedule.png'), fullPage: false });

    console.log('Capturas completadas.');
});
