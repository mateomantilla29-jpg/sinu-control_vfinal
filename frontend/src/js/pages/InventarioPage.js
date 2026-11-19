import { createInsumo, deleteInsumo, getInsumos, updateInsumo } from '../api/inventario.api.js';
import { Campo, leerFormulario, mostrarErrorApi, mostrarErrores } from '../components/common/Campo.js';
import { Kpis } from '../components/common/Kpis.js';
import { Tabla } from '../components/common/Tabla.js';
import { escapeHtml, formatDate, formatNumber } from '../utils/formatters.js';
import { confirmar, empty, loading, showApiError, tag, toast } from '../utils/ui.js';
import { esquemaInsumo, esValido, validar } from '../utils/validators.js';

const UNIDADES = ['kg', 'g', 'l', 'unidad'].map((u) => ({ value: u, label: u }));

function tagEstado(fila) {
  const base = { agotado: tag('Agotado', 'danger'), bajo: tag('Stock bajo', 'warn'), ok: tag('OK', 'ok') }[fila.estado];
  return fila.usar_primero ? `${base}<br />${tag('Usar primero', 'info')}` : base;
}

function Formulario(insumo) {
  return `
    <h3>${insumo ? 'Editar insumo' : 'Alta de insumo'}</h3>
    <form id="formInsumo" novalidate>
      ${Campo({ name: 'nombre', label: 'Nombre', value: insumo?.nombre, placeholder: 'Ej: Pargo rojo' })}
      <div class="row g-3">
        ${Campo({ name: 'unidad', label: 'Unidad', value: insumo?.unidad ?? 'kg', opciones: UNIDADES, col: 'col-sm-6' })}
        ${Campo({ name: 'stock_minimo', label: 'Stock mínimo', type: 'number', value: insumo?.stock_minimo, attrs: 'min="0" step="0.01"', col: 'col-sm-6' })}
      </div>
      ${Campo({ name: 'dias_alerta', label: 'Días de alerta de vencimiento', type: 'number', value: insumo?.dias_alerta, attrs: 'min="0" step="1"', help: 'Vacío = 3 días por defecto.' })}
      <div class="msg-error mb-2" data-error-general></div>
      <div class="d-flex gap-2 flex-wrap">
        ${insumo ? '<button class="btn btn-sinu" type="button" id="btnCancelarInsumo">Cancelar</button>' : ''}
        <button class="btn btn-sinu" type="submit">${insumo ? 'Guardar' : 'Agregar insumo'}</button>
      </div>
    </form>
  `;
}

const COLUMNAS = [
  { titulo: 'Insumo', render: (f) => `<b>${escapeHtml(f.insumo.nombre)}</b><br /><small>${f.lotes_activos} lote(s) activo(s)</small>` },
  { titulo: 'Disponible', clase: 'num', render: (f) => `<b>${formatNumber(f.disponible)}</b> ${f.insumo.unidad}` },
  { titulo: 'Mínimo', clase: 'num', render: (f) => formatNumber(f.insumo.stock_minimo) },
  { titulo: 'Vencido', clase: 'num', render: (f) => (f.vencido ? `<span style="color:var(--danger)">${formatNumber(f.vencido)}</span>` : '—') },
  { titulo: 'Próx. venc.', render: (f) => (f.proximo_vencimiento ? formatDate(f.proximo_vencimiento) : '—') },
  { titulo: 'Estado', render: tagEstado },
  {
    titulo: '',
    render: (f) => `<div class="acciones">
      <button class="btn btn-sinu sm" type="button" data-editar="${f.insumo.id}">Editar</button>
      <button class="btn btn-sinu sm peligro" type="button" data-eliminar="${f.insumo.id}" aria-label="Eliminar ${escapeHtml(f.insumo.nombre)}">✕</button>
    </div>`,
  },
];

export function InventarioPage() {
  return `<section class="contenedor" id="inventarioRoot">${loading('Cargando inventario…')}</section>`;
}

export function mountInventarioPage({ refreshAlertCount } = {}) {
  const root = document.querySelector('#inventarioRoot');
  let filas = [];
  let editando = null;

  function pintar() {
    const insumo = filas.find((f) => f.insumo.id === editando)?.insumo ?? null;
    const bajos = filas.filter((f) => f.estado !== 'ok').length;
    root.innerHTML = `
      <div class="cabecera-vista"><h2>Inventario</h2></div>
      ${Kpis([
        { texto: 'Insumos', valor: filas.length },
        { texto: 'Bajo mínimo o agotados', valor: bajos, color: bajos ? 'warn' : 'ok' },
        { texto: 'Lotes activos', valor: filas.reduce((s, f) => s + f.lotes_activos, 0) },
      ])}
      <div class="tarjeta">${Formulario(insumo)}</div>
      <div class="tarjeta"><h3>Existencias por insumo</h3>${Tabla({ columnas: COLUMNAS, filas, vacio: 'No hay insumos. Agregue el primero.' })}</div>
    `;
  }

  async function cargar() {
    try {
      filas = (await getInsumos()).data;
      pintar();
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar el inventario.');
      showApiError(error);
    }
  }

  async function guardar(form) {
    const valores = leerFormulario(form);
    const errores = validar(valores, esquemaInsumo);
    if (!esValido(errores)) {
      mostrarErrores(form, errores);
      return;
    }
    const payload = {
      nombre: valores.nombre,
      unidad: valores.unidad,
      stock_minimo: Number(valores.stock_minimo),
      dias_alerta: valores.dias_alerta === '' ? null : Number(valores.dias_alerta),
    };
    try {
      if (editando) {
        await updateInsumo(editando, payload);
        toast('Insumo actualizado.', 'ok');
      } else {
        await createInsumo(payload);
        toast('Insumo agregado.', 'ok');
      }
      editando = null;
      await cargar();
      refreshAlertCount?.();
    } catch (error) {
      mostrarErrorApi(form, error);
    }
  }

  root.addEventListener('submit', (event) => {
    event.preventDefault();
    guardar(event.target);
  });

  root.addEventListener('click', async (event) => {
    const editar = event.target.closest('[data-editar]');
    const eliminar = event.target.closest('[data-eliminar]');

    if (event.target.closest('#btnCancelarInsumo')) {
      editando = null;
      pintar();
    } else if (editar) {
      editando = Number(editar.dataset.editar);
      pintar();
      root.querySelector('[name="nombre"]').focus();
    } else if (eliminar) {
      const id = Number(eliminar.dataset.eliminar);
      const nombre = filas.find((f) => f.insumo.id === id)?.insumo.nombre ?? '';
      if (await confirmar('Eliminar insumo', `¿Eliminar <b>${escapeHtml(nombre)}</b>?`, 'Eliminar', true)) {
        try {
          await deleteInsumo(id);
          toast('Insumo eliminado.', 'ok');
          await cargar();
          refreshAlertCount?.();
        } catch (error) {
          showApiError(error);
        }
      }
    }
  });

  cargar();
}
