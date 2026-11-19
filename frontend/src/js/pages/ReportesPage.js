import { getConsumoInsumos, getMasVendidos, getMovimientos } from '../api/reportes.api.js';
import { leerFormulario, mostrarErrorApi, mostrarErrores } from '../components/common/Campo.js';
import { FiltroFechas } from '../components/common/FiltroFechas.js';
import { Tabla } from '../components/common/Tabla.js';
import { escapeHtml, formatCurrency, formatDate, formatNumber, todayIso } from '../utils/formatters.js';
import { loading, tag } from '../utils/ui.js';
import { esquemaFiltroFechas, esValido, validar } from '../utils/validators.js';

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'consumo', label: 'Consumo por pedido' },
  { value: 'ajuste', label: 'Ajuste (devolución)' },
  { value: 'merma', label: 'Merma' },
];
const TONO_TIPO = { ingreso: 'ok', consumo: 'info', ajuste: 'gris', merma: 'danger' };

function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function MasVendidos(r) {
  return Tabla({
    columnas: [
      { titulo: '#', render: (f) => f.pos },
      { titulo: 'Plato', render: (f) => `<b>${escapeHtml(f.plato)}</b>` },
      { titulo: 'Unidades', clase: 'num', render: (f) => f.unidades },
      { titulo: 'Pedidos', clase: 'num', render: (f) => f.pedidos },
      { titulo: 'Ingresos', clase: 'num', render: (f) => formatCurrency(f.ingresos) },
    ],
    filas: r.filas.map((f, i) => ({ ...f, pos: i + 1 })),
    vacio: 'No hay ventas en el periodo.',
    pie: ['', 'Total', r.totales.unidades, '', formatCurrency(r.totales.ingresos)],
  });
}

function Consumo(r) {
  const n = (v, u) => (v ? `${formatNumber(v)} ${u}` : '—');
  return Tabla({
    columnas: [
      { titulo: 'Insumo', render: (f) => `<b>${escapeHtml(f.insumo)}</b>` },
      { titulo: 'Ingresado', clase: 'num', render: (f) => n(f.ingresado, f.unidad) },
      { titulo: 'Consumido', clase: 'num', render: (f) => `<b>${n(f.consumido, f.unidad)}</b>` },
      { titulo: 'Mermado', clase: 'num', render: (f) => (f.mermado ? `<span style="color:var(--danger)">${n(f.mermado, f.unidad)}</span>` : '—') },
    ],
    filas: r.filas,
    vacio: 'No hay movimientos de inventario en el periodo.',
  });
}

function Movimientos(r) {
  return Tabla({
    columnas: [
      { titulo: 'Fecha', render: (m) => `${formatDate(m.fecha)} <small>${m.fecha.slice(11, 16)}</small>` },
      { titulo: 'Tipo', render: (m) => tag(m.tipo_nombre, TONO_TIPO[m.tipo] ?? 'gris') },
      { titulo: 'Insumo', render: (m) => `${escapeHtml(m.insumo)}${m.lote ? ` <small>${m.lote}</small>` : ''}` },
      { titulo: 'Cantidad', clase: 'num', render: (m) => `${m.cantidad > 0 ? '+' : ''}${formatNumber(m.cantidad)} ${m.unidad}` },
      { titulo: 'Nota', render: (m) => `${escapeHtml(m.nota)}<br /><small>${escapeHtml(m.usuario)}</small>` },
    ],
    filas: r.filas,
    vacio: 'No hay movimientos en el periodo.',
  });
}

export function ReportesPage() {
  return `
    <section class="contenedor">
      <div class="cabecera-vista"><h2>Reportes</h2><small>Datos reales de pedidos y movimientos de inventario</small></div>
      <div class="tarjeta">${FiltroFechas({ desde: haceDias(6), hasta: todayIso() })}</div>
      <div id="reportesCuerpo">${loading('Consultando…')}</div>
    </section>`;
}

export function mountReportesPage() {
  const form = document.querySelector('#formFiltro');
  const cuerpo = document.querySelector('#reportesCuerpo');
  let tipo = '';

  async function consultar() {
    const valores = leerFormulario(form);
    const errores = validar(valores, esquemaFiltroFechas);
    if (!esValido(errores)) {
      mostrarErrores(form, errores);
      return;
    }
    mostrarErrores(form, {});
    cuerpo.innerHTML = loading('Consultando…');
    const filtro = { desde: valores.desde, hasta: valores.hasta };
    try {
      const [vendidos, consumo, movimientos] = await Promise.all([
        getMasVendidos(filtro),
        getConsumoInsumos(filtro),
        getMovimientos({ ...filtro, tipo }),
      ]);
      const v = vendidos.data;
      cuerpo.innerHTML = `
        <div class="tarjeta"><h3>Platos más vendidos</h3>
          <p class="muted">Pedidos no cancelados del ${formatDate(v.periodo.desde)} al ${formatDate(v.periodo.hasta)}.</p>
          ${MasVendidos(v)}</div>
        <div class="tarjeta"><h3>Consumo por insumo</h3>
          <p class="muted">Consumido = descontado por pedidos menos lo devuelto por cancelaciones.</p>
          ${Consumo(consumo.data)}</div>
        <div class="tarjeta">
          <div class="cabecera-vista"><h3>Movimientos de inventario (${movimientos.data.totales.movimientos})</h3>
            <select class="form-select w-auto" id="selTipo" aria-label="Filtrar por tipo">
              ${TIPOS.map((t) => `<option value="${t.value}" ${t.value === tipo ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select></div>
          ${Movimientos(movimientos.data)}</div>`;
    } catch (error) {
      cuerpo.innerHTML = '';
      mostrarErrorApi(form, error);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    consultar();
  });
  cuerpo.addEventListener('change', (event) => {
    if (event.target.id === 'selTipo') {
      tipo = event.target.value;
      consultar();
    }
  });

  consultar();
}
