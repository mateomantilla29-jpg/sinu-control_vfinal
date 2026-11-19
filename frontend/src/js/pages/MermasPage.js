import { darDeBajaLote, darDeBajaVencidos, getLotes } from '../api/inventario.api.js';
import { getMovimientos } from '../api/reportes.api.js';
import { Kpis } from '../components/common/Kpis.js';
import { Tabla } from '../components/common/Tabla.js';
import { abrirMermaModal } from '../components/inventario/MermaModal.js';
import { escapeHtml, formatDate, formatNumber, todayIso } from '../utils/formatters.js';
import { confirmar, empty, loading, showApiError, tag, toast } from '../utils/ui.js';
import { textoDias } from './LotesPage.js';

const DIAS_HISTORIAL = 30;

function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const COL_VENCIDOS = [
  { titulo: 'Lote', render: (l) => l.codigo },
  { titulo: 'Insumo', render: (l) => `<b>${escapeHtml(l.insumo)}</b>` },
  { titulo: 'Cantidad', clase: 'num', render: (l) => `<b>${formatNumber(l.cantidad_actual)}</b> ${l.unidad}` },
  { titulo: 'Venció', render: (l) => `${formatDate(l.fecha_vencimiento)}<br /><small>${tag(`hace ${-l.dias_para_vencer} d`, 'danger')}</small>` },
  { titulo: '', render: (l) => `<button class="btn btn-sinu sm peligro" type="button" data-baja="${l.id}">Dar de baja</button>` },
];

const COL_ACTIVOS = [
  { titulo: 'Lote', render: (l) => l.codigo },
  { titulo: 'Insumo', render: (l) => `<b>${escapeHtml(l.insumo)}</b>` },
  { titulo: 'Queda', clase: 'num', render: (l) => `${formatNumber(l.cantidad_actual)} ${l.unidad}` },
  { titulo: 'Vence', render: (l) => textoDias(l.dias_para_vencer) },
  { titulo: '', render: (l) => `<button class="btn btn-sinu sm" type="button" data-merma="${l.id}">Registrar merma</button>` },
];

const COL_HISTORIAL = [
  { titulo: 'Fecha', render: (m) => `${formatDate(m.fecha)}<br /><small>${m.fecha.slice(11, 16)}</small>` },
  { titulo: 'Insumo', render: (m) => `<b>${escapeHtml(m.insumo)}</b>${m.lote ? `<br /><small>${m.lote}</small>` : ''}` },
  { titulo: 'Cantidad', clase: 'num', render: (m) => `<span style="color:var(--danger)">${formatNumber(m.cantidad)}</span> ${m.unidad}` },
  { titulo: 'Motivo', render: (m) => escapeHtml(m.nota) },
  { titulo: 'Usuario', render: (m) => escapeHtml(m.usuario) },
];

export function MermasPage() {
  return `<section class="contenedor" id="mermasRoot">${loading('Cargando mermas…')}</section>`;
}

export function mountMermasPage({ refreshAlertCount } = {}) {
  const root = document.querySelector('#mermasRoot');
  let lotes = [];

  async function cargar() {
    try {
      const [respLotes, respMov] = await Promise.all([
        getLotes(),
        getMovimientos({ desde: haceDias(DIAS_HISTORIAL - 1), hasta: todayIso(), tipo: 'merma' }),
      ]);
      lotes = respLotes.data;
      const vencidos = lotes.filter((l) => l.estado === 'vencido');
      const activos = lotes.filter((l) => l.estado === 'activo');
      const historial = respMov.data.filas;
      root.innerHTML = `
        <div class="cabecera-vista"><h2>Mermas y bajas</h2></div>
        ${Kpis([
          { texto: 'Lotes vencidos con existencias', valor: vencidos.length, color: vencidos.length ? 'danger' : 'ok' },
          { texto: `Mermas registradas (últimos ${DIAS_HISTORIAL} días)`, valor: historial.length },
        ])}
        <div class="tarjeta">
          <div class="cabecera-vista"><h3>Lotes vencidos</h3>
            ${vencidos.length ? '<button class="btn btn-sinu sm peligro" type="button" id="btnBajaTodos">Dar de baja todos</button>' : ''}</div>
          <p class="muted">Un lote vencido ya no se usa en pedidos. Al darlo de baja, su cantidad sale del inventario y queda un movimiento de merma.</p>
          ${Tabla({ columnas: COL_VENCIDOS, filas: vencidos, vacio: '✅ No hay lotes vencidos con existencias.' })}
        </div>
        <div class="tarjeta"><h3>Merma de un lote vigente</h3>
          <p class="muted">Para producto dañado, derramado o en mal estado antes de su vencimiento.</p>
          ${Tabla({ columnas: COL_ACTIVOS, filas: activos, vacio: 'No hay lotes vigentes.' })}
        </div>
        <div class="tarjeta"><h3>Historial de mermas (${DIAS_HISTORIAL} días)</h3>
          ${Tabla({ columnas: COL_HISTORIAL, filas: historial, vacio: 'Sin mermas en el periodo.' })}
        </div>`;
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar las mermas.');
      showApiError(error);
    }
  }

  const recargar = async () => {
    await cargar();
    refreshAlertCount?.();
  };

  root.addEventListener('click', async (event) => {
    const merma = event.target.closest('[data-merma]');
    const baja = event.target.closest('[data-baja]');
    try {
      if (merma) {
        abrirMermaModal(lotes.find((l) => l.id === Number(merma.dataset.merma)), recargar);
      } else if (baja) {
        const lote = lotes.find((l) => l.id === Number(baja.dataset.baja));
        const ok = await confirmar(
          `Dar de baja ${lote.codigo}`,
          `Se descontarán <b>${formatNumber(lote.cantidad_actual)} ${lote.unidad}</b> de ${escapeHtml(lote.insumo)}.`,
          'Dar de baja',
          true,
        );
        if (ok) {
          toast((await darDeBajaLote(lote.id)).message, 'ok');
          await recargar();
        }
      } else if (event.target.closest('#btnBajaTodos')) {
        const n = lotes.filter((l) => l.estado === 'vencido').length;
        if (await confirmar('Dar de baja todos los vencidos', `Se darán de baja <b>${n}</b> lote(s) vencido(s).`, 'Dar de baja', true)) {
          toast((await darDeBajaVencidos()).message, 'ok');
          await recargar();
        }
      }
    } catch (error) {
      showApiError(error);
    }
  });

  cargar();
}
