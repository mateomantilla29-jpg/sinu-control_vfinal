import { getResumenTablero } from '../api/tablero.api.js';
import { Kpis } from '../components/common/Kpis.js';
import { Tabla } from '../components/common/Tabla.js';
import { escapeHtml, formatCurrency, formatDate, formatNumber } from '../utils/formatters.js';
import { empty, loading, showApiError, tag } from '../utils/ui.js';

function textoDias(d) {
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  return `en ${d} días`;
}

function PlatosPosibles(platos) {
  if (!platos.length) {
    return empty('No hay platos activos.');
  }
  const max = Math.max(1, ...platos.map((d) => d.posibles));
  return platos
    .map(
      (d) => `
      <div class="mb-2">
        <div class="d-flex justify-content-between">
          <span>${escapeHtml(d.plato.nombre)}</span>
          <b style="color:var(--${d.disponible ? 'texto' : 'danger'})">${d.disponible ? d.posibles : 'No disponible'}</b>
        </div>
        <div class="barra-h"><div style="width:${(d.posibles / max) * 100}%"></div></div>
      </div>`,
    )
    .join('');
}

function StockBajo(filas) {
  return Tabla({
    columnas: [
      { titulo: 'Insumo', render: (f) => `<b>${escapeHtml(f.insumo.nombre)}</b>` },
      { titulo: 'Disponible', clase: 'num', render: (f) => `${formatNumber(f.disponible)} ${f.insumo.unidad}` },
      { titulo: 'Mínimo', clase: 'num', render: (f) => formatNumber(f.insumo.stock_minimo) },
      { titulo: 'Estado', render: (f) => (f.estado === 'agotado' ? tag('Agotado', 'danger') : tag('Stock bajo', 'warn')) },
    ],
    filas,
    vacio: '✅ Todos los insumos están sobre el mínimo.',
  });
}

function Vencimientos(lotes) {
  if (!lotes.length) {
    return empty('No hay lotes que venzan en los próximos 7 días.');
  }
  const porDia = {};
  lotes.forEach((l) => (porDia[l.fecha_vencimiento] ??= []).push(l));
  return Object.keys(porDia)
    .sort()
    .map((fecha) => {
      const d = porDia[fecha][0].dias_para_vencer;
      return `<div class="dia-venc" style="border-left-color:var(--${d <= 1 ? 'danger' : 'warn'})">
        <b>${formatDate(fecha)}</b> · ${textoDias(d)}<br />
        ${porDia[fecha].map((l) => `${escapeHtml(l.insumo)} (${l.codigo}): ${formatNumber(l.cantidad_actual)} ${l.unidad}`).join(' · ')}
      </div>`;
    })
    .join('');
}

export function TableroPage() {
  return `<section class="contenedor" id="tableroRoot">${loading('Cargando tablero…')}</section>`;
}

export function mountTableroPage() {
  const root = document.querySelector('#tableroRoot');

  getResumenTablero()
    .then(({ data: r }) => {
      root.innerHTML = `
        <div class="cabecera-vista"><h2>Tablero general</h2><small>${formatDate(r.fecha)}</small></div>
        ${Kpis([
          { valor: formatCurrency(r.ventas_hoy.total), texto: `Ventas de hoy (${r.ventas_hoy.cantidad})` },
          { valor: r.pedidos_en_cocina, texto: 'Pedidos en cocina' },
          { valor: r.alertas_activas, texto: 'Alertas activas', color: 'danger' },
          { valor: r.stock_bajo.length, texto: 'Insumos bajo mínimo o agotados', color: 'warn' },
          { valor: `${r.platos_no_disponibles} / ${r.platos.length}`, texto: 'Platos no disponibles' },
        ])}
        <div class="tarjeta"><h3>Platos posibles ahora</h3>${PlatosPosibles(r.platos)}</div>
        <div class="tarjeta"><h3>Stock bajo</h3>${StockBajo(r.stock_bajo)}</div>
        <div class="tarjeta"><h3>Vencimientos de los próximos 7 días</h3>${Vencimientos(r.por_vencer)}</div>
        <div class="tarjeta">
          <h3>Más vendidos, reportes y caja</h3>
          <div class="acciones">
            <button class="btn btn-sinu" type="button" data-view="reportes">Ver reportes</button>
            <button class="btn btn-sinu" type="button" data-view="caja">Cierre de caja</button>
          </div>
        </div>
      `;
    })
    .catch((error) => {
      root.innerHTML = empty('No fue posible cargar el tablero.');
      showApiError(error);
    });
}
