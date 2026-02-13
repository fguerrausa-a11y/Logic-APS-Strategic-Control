// Utility functions for Gantt chart features

export const exportGanttToPDF = async (
  machines: any[],
  operations: any[],
  viewRange: { start: Date; days: number },
  scenarioName: string
) => {
  // Create a printable version
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes para exportar a PDF');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cronograma - ${scenarioName}</title>
      <style>
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        }
        body { background: #fff; color: #000; }
        h1 { font-size: 18px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .conflict { background: #fff3cd; }
        .header { margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 10px; font-size: 12px; }
        .stat { padding: 5px 10px; background: #f8f9fa; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cronograma Maestro - ${scenarioName}</h1>
        <div class="stats">
          <div class="stat">Máquinas: ${machines.length}</div>
          <div class="stat">Operaciones: ${operations.length}</div>
          <div class="stat">Período: ${viewRange.start.toLocaleDateString()} - ${new Date(viewRange.start.getTime() + viewRange.days * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Máquina</th>
            <th>Centro de Trabajo</th>
            <th>OP</th>
            <th>Producto</th>
            <th>Operación</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${machines.map(machine => {
    const machineOps = operations.filter(op => op.machine_id === machine.id);
    return machineOps.map((op, idx) => `
              <tr>
                ${idx === 0 ? `<td rowspan="${machineOps.length}">${machine.name}</td>` : ''}
                ${idx === 0 ? `<td rowspan="${machineOps.length}">${machine.work_center?.name || machine.work_center_id}</td>` : ''}
                <td>${op.work_order_id}</td>
                <td>${op.item?.name || op.item_id}</td>
                <td>Op ${op.operation_sequence}</td>
                <td>${new Date(op.start_date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>${new Date(op.end_date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>${op.quantity}</td>
              </tr>
            `).join('');
  }).join('')}
        </tbody>
      </table>
      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => window.close(), 100);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const calculateMachineUtilization = (
  machine: any,
  operations: any[],
  viewRange: { start: Date; days: number }
) => {
  const machineOps = operations.filter(op => op.machine_id === machine.id);

  if (machineOps.length === 0) {
    return {
      utilizationPercent: 0,
      totalHours: 0,
      availableHours: 0,
      operationCount: 0
    };
  }

  // Calculate total operation time in hours
  const totalOpMinutes = machineOps.reduce((sum, op) => {
    const duration = new Date(op.end_date).getTime() - new Date(op.start_date).getTime();
    return sum + (duration / (1000 * 60));
  }, 0);

  const totalOpHours = totalOpMinutes / 60;

  // Available hours in the view range (assuming 24/7 operation for simplicity)
  const availableHours = viewRange.days * 24;

  const utilizationPercent = Math.min(100, (totalOpHours / availableHours) * 100);

  return {
    utilizationPercent: Math.round(utilizationPercent * 10) / 10,
    totalHours: Math.round(totalOpHours * 10) / 10,
    availableHours,
    operationCount: machineOps.length
  };
};

export const getUtilizationColor = (percent: number) => {
  if (percent < 50) return 'text-emerald-400';
  if (percent < 80) return 'text-amber-400';
  return 'text-rose-400';
};

export const getUtilizationBgColor = (percent: number) => {
  if (percent < 50) return 'bg-emerald-500';
  if (percent < 80) return 'bg-amber-500';
  return 'bg-rose-500';
};

export const exportStockFlowToPDF = (
  itemId: string,
  itemName: string,
  events: any[],
  scenarioName: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes para exportar a PDF');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>StockFlow - ${itemName}</title>
      <style>
        @media print {
          @page { size: portrait; margin: 1.5cm; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        }
        body { background: #fff; color: #1a1a1a; font-family: 'Segoe UI', sans-serif; line-height: 1.4; }
        .header { border-bottom: 2px solid #4f46e5; margin-bottom: 30px; padding-bottom: 10px; }
        h1 { font-size: 24px; color: #4f46e5; margin: 0; text-transform: uppercase; letter-spacing: -0.025em; }
        .meta { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; font-weight: bold; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
        th { background: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 12px 8px; text-align: left; text-transform: uppercase; color: #374151; }
        td { border-bottom: 1px solid #f3f4f6; padding: 10px 8px; }
        .type-pill { px: 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
        .CONSUMPTION { color: #be123c; }
        .PRODUCTION { color: #15803d; }
        .PURCHASE { color: #b45309; }
        .INITIAL { color: #4b5563; }
        .delta-pos { color: #15803d; font-weight: bold; }
        .delta-neg { color: #be123c; font-weight: bold; }
        .saldo { background: #f5f3ff; font-weight: 800; font-size: 12px; }
        .neg-stock { color: #e11d48; }
        .footer { margin-top: 40px; font-size: 9px; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte de StockFlow Proyectado</h1>
        <div class="meta">
          <span>Artículo: ${itemId} - ${itemName}</span>
          <span>Escenario: ${scenarioName}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Fecha / Evento</th>
            <th style="text-align:center">Tipo</th>
            <th style="text-align:right">Ref.</th>
            <th style="text-align:right">Variación</th>
            <th style="text-align:right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(ev => `
            <tr>
              <td>
                <div style="font-weight:700">${new Date(ev.date).toLocaleString('es-AR')}</div>
              </td>
              <td style="text-align:center">
                <span class="type-pill ${ev.type}">${ev.type}</span>
              </td>
              <td style="text-align:right; color:#6b7280">${ev.ref}</td>
              <td style="text-align:right" class="${ev.delta >= 0 ? 'delta-pos' : 'delta-neg'}">
                ${ev.delta >= 0 ? '+' : ''}${ev.delta.toFixed(1)}
              </td>
              <td style="text-align:right" class="saldo ${ev.total < 0 ? 'neg-stock' : ''}">
                ${ev.total.toFixed(1)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        Generado por APS Strategic Manufacturing Control el ${new Date().toLocaleString()}
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const exportDetailedOpsToPDF = (
  operations: any[],
  items: any[],
  machines: any[],
  scenarioName: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes para exportar a PDF');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Secuenciación Detallada - ${scenarioName}</title>
      <style>
        @media print {
          @page { size: portrait; margin: 1.5cm; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        }
        body { background: #fff; color: #1a1a1a; font-family: 'Segoe UI', sans-serif; line-height: 1.4; }
        .header { border-bottom: 3px solid #10b981; margin-bottom: 25px; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
        h1 { font-size: 20px; color: #065f46; margin: 0; text-transform: uppercase; font-weight: 900; }
        .scenario-tag { font-size: 10px; background: #ecfdf5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-weight: bold; border: 1px solid #10b981; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background: #f0fdf4; border-bottom: 2px solid #10b981; padding: 12px 8px; text-align: left; text-transform: uppercase; color: #065f46; font-weight: 900; }
        td { border-bottom: 1px solid #f3f4f6; padding: 10px 8px; vertical-align: middle; }
        .seq { font-weight: 900; color: #10b981; }
        .wo { font-weight: 900; color: #1a1a1a; }
        .machine { color: #6b7280; font-weight: 600; font-size: 9px; }
        .time { font-family: monospace; font-weight: bold; color: #059669; }
        .time-end { color: #dc2626; }
        .locked { filter: grayscale(1); opacity: 0.5; }
        .footer { margin-top: 40px; font-size: 9px; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Salida de Producción Detallada</h1>
          <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">Secuenciación técnica de planta por orden cronológico</div>
        </div>
        <div class="scenario-tag">${scenarioName}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th width="40">Seq.</th>
            <th>Orden / Recurso</th>
            <th>Artículo / Producto</th>
            <th width="150">Programación (Inicio → Fin)</th>
            <th width="40" style="text-align:center">Fix</th>
          </tr>
        </thead>
        <tbody>
          ${operations.map(op => {
    const item = items.find(it => it.id === op.item_id);
    const machine = machines.find(m => m.id === op.machine_id);
    return `
              <tr>
                <td class="seq">S${op.operation_sequence}</td>
                <td>
                  <div class="wo">${op.work_order_id}</div>
                  <div class="machine">${machine?.name || 'Mesa Virtual'}</div>
                </td>
                <td>
                  <div style="font-weight:700">${item?.name || op.item_id}</div>
                  <div style="font-size:8px; color:#9ca3af">ID: ${op.item_id} • Cant: ${op.quantity}U</div>
                </td>
                <td>
                  <div class="time">${new Date(op.start_date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                  <div class="time time-end">${new Date(op.end_date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </td>
                <td style="text-align:center">${op.is_locked ? '🔒' : ''}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
      <div class="footer">
        Generado por APS Strategic Manufacturing Control el ${new Date().toLocaleString()} • Confidencial - Uso Interno
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
