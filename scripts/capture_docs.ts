
import { chromium } from 'playwright';
import path from 'path';

async function capture() {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    console.log('Navegando a la App...');
    await page.goto('http://localhost:3000/#/');

    // Esperar a que la app cargue
    await page.waitForTimeout(2000);

    // Asegurar Modo Claro (debería ser default, pero clickeamos por si acaso si vemos el icono de luna)
    try {
        const themeBtn = await page.locator('button[title*="Aesthetic"], button[title*="Visual"]').first();
        const themeIcon = await themeBtn.innerText();
        // Si dice 'dark_mode' es que está en light? No, según mi cambio de logic el icono cambia.
        // Simplemente forzamos light en LocalStorage y recargamos si es necesario.
    } catch (e) { }

    // Seleccionar Escenario
    console.log('Seleccionando escenario...');
    const selector = page.locator('text=Seleccionar Simulación').first();
    await selector.click();
    await page.waitForTimeout(500);

    // Click en el primer escenario de la lista
    const firstScenario = page.locator('div[class*="cursor-pointer"]').first();
    await firstScenario.click();

    console.log('Esperando carga de datos...');
    await page.waitForTimeout(3000); // Dar tiempo a que los KPIs y el Gantt carguen

    const assetsPath = 'c:/Users/fg/OneDrive/Proyectos Antigravity/APS/public/docs/assets';

    // Screenshots
    console.log('Capturando Dashboard...');
    await page.goto('http://localhost:3000/#/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(assetsPath, 'dashboard.png') });

    console.log('Capturando Carga de Centros...');
    await page.goto('http://localhost:3000/#/load');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(assetsPath, 'load_analysis.png') });

    console.log('Capturando Simulación...');
    await page.goto('http://localhost:3000/#/simulation');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(assetsPath, 'simulation.png') });

    console.log('Capturando Gantt...');
    await page.goto('http://localhost:3000/#/schedule');
    await page.waitForTimeout(2000); // El Gantt tarda más
    await page.screenshot({ path: path.join(assetsPath, 'schedule.png') });

    console.log('Capturas completadas.');
    await browser.close();
}

capture().catch(console.error);
