import { cerrarCaja, getCierres, getResumenCaja } from '../api/caja.api.js';
import { Campo, leerFormulario, mostrarErrorApi } from '../components/common/Campo.js';
import { Kpis } from '../components/common/Kpis.js';
import { Tabla } from '../components/common/Tabla.js';
import { escapeHtml, formatCurrency, formatDate, formatTime, todayIso } from '../utils/formatters.js';
import { confirmar, empty, loading, showApiError, toast } from '../utils/ui.js';

const COL_CIERRES = [
  { titulo: 'Día', render: (c) => `<b>${formatDate(c.fecha)}</b>` },
  { titulo: 'Entregados', clase: 'num', render: (c) => `${c.pedidos_entregados} · ${formatCurrency(c.total_entregados)}` },
  { titulo: 'Cancelados', clase: 'num', render: (c) => `${c.pedidos_cancelados} · ${formatCurrency(c.total_cancelados)}` },
  { titulo: 'Ventas', clase: 'num', render: (c) => `<b>${formatCurrency(c.total_ventas)}</b>` },
  { titulo: 'Cerró', render: (c) => `${escapeHtml(c.usuario)}<br /><small>${formatTime(c.fecha_cierre)}</small>` },
  { titulo: 'Observación', render: (c) => escapeHtml(c.observacion || '—') },
];

function motivoNoCerrar(r) {
  if (r.cierre) return 'La caja de este día ya está cerrada.';
  if (r.abiertos.cantidad) return `Hay ${r.abiertos.cantidad} pedido(s) sin entregar: entréguelos o cancélelos antes de cerrar.`;
  return '';
}

export function CajaPage() {
  return `<section class="contenedor" id="cajaRoot">${loading('Cargando caja…')}</section>`;
}

export function mountCajaPage() {
  const root = document.querySelector('#cajaRoot');
  let fecha = todayIso();

  async function cargar() {
    try {
      const [respResumen, respCierres] = await Promise.all([getResumenCaja(fecha), getCierres()]);
      const r = respResumen.data;
      const motivo = motivoNoCerrar(r);
      root.innerHTML = `
        <div class="cabecera-vista"><h2>Cierre de caja</h2>
          <input class="form-control w-auto" type="date" id="cajaFecha" value="${fecha}" max="${todayIso()}" aria-label="Día" /></div>
        <div class="tarjeta">
          <h3>${formatDate(r.fecha)}</h3>
          <div class="cifra-grande">${formatCurrency(r.ventas.total)}</div>
          <p class="muted">Ventas del día: ${r.ventas.cantidad} pedido(s) no cancelados. Es la misma cifra de “Ventas de hoy” del tablero.</p>
          ${Kpis([
            { texto: 'Pedidos entregados', valor: `${r.entregados.cantidad} · ${formatCurrency(r.entregados.total)}`, color: 'ok' },
            { texto: 'Pedidos sin entregar (pendiente, en preparación o listo)', valor: `${r.abiertos.cantidad} · ${formatCurrency(r.abiertos.total)}`, color: r.abiertos.cantidad ? 'warn' : '' },
            { texto: 'Pedidos cancelados (no suman)', valor: `${r.cancelados.cantidad} · ${formatCurrency(r.cancelados.total)}`, color: 'danger' },
          ])}
          ${
            r.cierre
              ? `<div class="nota-coincide">✅ Caja cerrada por <b>${escapeHtml(r.cierre.usuario)}</b> a las ${formatTime(r.cierre.fecha_cierre)} con ${formatCurrency(r.cierre.total_ventas)}.</div>`
              : `<form id="formCierre" novalidate>
                  ${Campo({ name: 'observacion', label: 'Observación (opcional)', placeholder: 'Ej: sin novedades', attrs: 'maxlength="255"' })}
                  <div class="msg-error mb-2" data-error-general>${escapeHtml(motivo)}</div>
                  <button class="btn btn-sinu xl" type="submit" ${motivo ? `disabled title="${escapeHtml(motivo)}"` : ''}>Cerrar caja del día</button>
                </form>`
          }
        </div>
        <div class="tarjeta"><h3>Cierres anteriores</h3>${Tabla({ columnas: COL_CIERRES, filas: respCierres.data, vacio: 'Aún no hay cierres.' })}</div>`;
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar la caja.');
      showApiError(error);
    }
  }

  root.addEventListener('change', (event) => {
    if (event.target.id === 'cajaFecha' && event.target.value) {
      fecha = event.target.value;
      cargar();
    }
  });

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const ok = await confirmar(
      `Cerrar caja del ${formatDate(fecha)}`,
      'El cierre guarda los totales del día y no se puede repetir.',
      'Cerrar caja',
    );
    if (!ok) return;
    try {
      const resp = await cerrarCaja({ fecha, observacion: leerFormulario(form).observacion });
      toast(resp.message, 'ok');
      await cargar();
    } catch (error) {
      mostrarErrorApi(form, error);
    }
  });

  cargar();
}
