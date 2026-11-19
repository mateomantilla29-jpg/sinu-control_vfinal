import { createLote, darDeBajaLote, getInsumos, getLotes } from '../api/inventario.api.js';
import { Campo, leerFormulario, mostrarErrorApi, mostrarErrores } from '../components/common/Campo.js';
import { Tabla } from '../components/common/Tabla.js';
import { abrirMermaModal } from '../components/inventario/MermaModal.js';
import { escapeHtml, formatDate, formatNumber, todayIso } from '../utils/formatters.js';
import { confirmar, empty, loading, showApiError, tag, toast } from '../utils/ui.js';
import { esquemaLote, esValido, validar } from '../utils/validators.js';

export const TAG_LOTE = {
  activo: ['Activo', 'ok'],
  agotado: ['Agotado', 'gris'],
  vencido: ['Vencido', 'danger'],
  mermado: ['Dado de baja', 'gris'],
};

export function textoDias(d) {
  if (d < 0) return tag(`Vencido hace ${-d} d`, 'danger');
  if (d === 0) return tag('Vence hoy', 'danger');
  if (d === 1) return tag('Mañana', 'warn');
  return `${d} días`;
}

function Formulario(insumos) {
  const hoy = todayIso();
  return `
    <h3>Ingreso de lote</h3>
    <form id="formLote" novalidate>
      ${Campo({
        name: 'insumo_id',
        label: 'Insumo',
        opciones: [{ value: '', label: 'Seleccione…' }, ...insumos.map((f) => ({ value: f.insumo.id, label: `${f.insumo.nombre} (${f.insumo.unidad})` }))],
      })}
      ${Campo({ name: 'cantidad', label: 'Cantidad', type: 'number', placeholder: 'Ej: 5', attrs: 'min="0" step="0.01"' })}
      <div class="row g-3">
        ${Campo({ name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date', value: hoy, attrs: `max="${hoy}"`, col: 'col-sm-6' })}
        ${Campo({ name: 'fecha_vencimiento', label: 'Fecha de vencimiento', type: 'date', attrs: `min="${hoy}"`, col: 'col-sm-6' })}
      </div>
      <div class="msg-error mb-2" data-error-general></div>
      <button class="btn btn-sinu xl w-100" type="submit">Registrar lote</button>
    </form>
  `;
}

function acciones(l) {
  const botones = [];
  if (['activo', 'vencido'].includes(l.estado)) {
    botones.push(`<button class="btn btn-sinu sm" type="button" data-merma="${l.id}">Merma</button>`);
  }
  if (l.estado === 'vencido') {
    botones.push(`<button class="btn btn-sinu sm peligro" type="button" data-baja="${l.id}">Dar de baja</button>`);
  }
  return `<div class="acciones">${botones.join('')}</div>`;
}

export const COLUMNAS_LOTE = [
  { titulo: 'Lote', render: (l) => l.codigo },
  { titulo: 'Insumo', render: (l) => `<b>${escapeHtml(l.insumo)}</b>` },
  { titulo: 'Actual / Inicial', clase: 'num', render: (l) => `<b>${formatNumber(l.cantidad_actual)}</b> / ${formatNumber(l.cantidad_inicial)} ${l.unidad}` },
  { titulo: 'Ingreso', render: (l) => formatDate(l.fecha_ingreso) },
  { titulo: 'Vence', render: (l) => `${formatDate(l.fecha_vencimiento)}<br /><small>${l.estado === 'activo' ? textoDias(l.dias_para_vencer) : ''}</small>` },
  { titulo: 'Estado', render: (l) => tag(...TAG_LOTE[l.estado]) },
  { titulo: '', render: acciones },
];

export function LotesPage() {
  return `<section class="contenedor" id="lotesRoot">${loading('Cargando lotes…')}</section>`;
}

export function mountLotesPage({ refreshAlertCount } = {}) {
  const root = document.querySelector('#lotesRoot');
  let verTodos = false;
  let lotes = [];

  async function cargar() {
    try {
      const [insumos, respLotes] = await Promise.all([getInsumos(), getLotes({ todos: verTodos })]);
      lotes = respLotes.data;
      root.innerHTML = `
        <div class="cabecera-vista"><h2>Lotes</h2></div>
        <div class="tarjeta">${Formulario(insumos.data)}</div>
        <div class="tarjeta">
          <div class="cabecera-vista"><h3>Lotes (orden FEFO)</h3>
            <button class="btn btn-sinu sm" type="button" id="btnVerTodos">${verTodos ? 'Solo con existencias' : 'Ver todos'}</button></div>
          ${Tabla({ columnas: COLUMNAS_LOTE, filas: lotes, vacio: 'No hay lotes con existencias.' })}
        </div>
      `;
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar los lotes.');
      showApiError(error);
    }
  }

  const recargar = async () => {
    await cargar();
    refreshAlertCount?.();
  };

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const valores = leerFormulario(form);
    const errores = validar(valores, esquemaLote(todayIso()));
    if (!esValido(errores)) {
      mostrarErrores(form, errores);
      return;
    }
    try {
      await createLote({
        insumo_id: Number(valores.insumo_id),
        cantidad: Number(valores.cantidad),
        fecha_ingreso: valores.fecha_ingreso,
        fecha_vencimiento: valores.fecha_vencimiento,
      });
      toast('Lote registrado.', 'ok');
      await recargar();
    } catch (apiError) {
      mostrarErrorApi(form, apiError);
    }
  });

  root.addEventListener('click', async (event) => {
    const merma = event.target.closest('[data-merma]');
    const baja = event.target.closest('[data-baja]');
    if (event.target.closest('#btnVerTodos')) {
      verTodos = !verTodos;
      cargar();
    } else if (merma) {
      abrirMermaModal(lotes.find((l) => l.id === Number(merma.dataset.merma)), recargar);
    } else if (baja) {
      const lote = lotes.find((l) => l.id === Number(baja.dataset.baja));
      const ok = await confirmar(
        `Dar de baja ${lote.codigo}`,
        `Se descontarán <b>${formatNumber(lote.cantidad_actual)} ${lote.unidad}</b> de ${escapeHtml(lote.insumo)} (vencido) y quedará en el historial de mermas.`,
        'Dar de baja',
        true,
      );
      if (ok) {
        try {
          toast((await darDeBajaLote(lote.id)).message, 'ok');
          await recargar();
        } catch (error) {
          showApiError(error);
        }
      }
    }
  });

  cargar();
}
