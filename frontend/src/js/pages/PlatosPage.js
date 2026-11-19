import { getInsumos } from '../api/inventario.api.js';
import { createPlato, deletePlato, getPlatos, updatePlato } from '../api/platos.api.js';
import { Campo, leerFormulario, mostrarErrorApi, mostrarErrores } from '../components/common/Campo.js';
import { Tabla } from '../components/common/Tabla.js';
import { escapeHtml, formatCurrency, formatNumber } from '../utils/formatters.js';
import { confirmar, empty, loading, showApiError, tag, toast } from '../utils/ui.js';
import { esquemaPlato, esValido, validar } from '../utils/validators.js';

/** Reglas de la receta (las mismas de PlatoDTO): al menos un insumo, sin repetidos, cantidades > 0. */
function validarReceta(receta) {
  const items = receta.filter((r) => r.insumo_id || r.cantidad !== '');
  if (!items.length) return 'La receta debe tener al menos un insumo.';
  if (items.some((r) => !r.insumo_id)) return 'Seleccione el insumo de cada fila de la receta.';
  if (items.some((r) => !(Number(r.cantidad) > 0))) return 'Cada insumo de la receta necesita una cantidad mayor que 0.';
  const ids = items.map((r) => r.insumo_id);
  if (new Set(ids).size !== ids.length) return 'Un insumo está repetido en la receta.';
  return '';
}

function opcionesInsumos(insumos, seleccionado) {
  return `<option value="">Insumo…</option>${insumos
    .map((i) => `<option value="${i.id}" ${i.id === seleccionado ? 'selected' : ''}>${escapeHtml(i.nombre)} (${i.unidad})</option>`)
    .join('')}`;
}

function FilasReceta(receta, insumos) {
  if (!receta.length) {
    return empty('Sin insumos');
  }
  return receta
    .map(
      (r, i) => `
      <div class="row g-2 align-items-end mb-2">
        <div class="col-7"><select class="form-select" data-receta-insumo="${i}" aria-label="Insumo ${i + 1}">${opcionesInsumos(insumos, r.insumo_id)}</select></div>
        <div class="col-3"><input class="form-control" data-receta-cantidad="${i}" type="number" min="0" step="0.001" placeholder="Cant." value="${r.cantidad}" aria-label="Cantidad ${i + 1}" /></div>
        <div class="col-2"><button class="btn btn-sinu sm peligro w-100" type="button" data-quitar="${i}" aria-label="Quitar insumo">✕</button></div>
      </div>`,
    )
    .join('');
}

function Formulario(plato, receta, insumos) {
  return `
    <h3>${plato ? 'Editar plato' : 'Nuevo plato'}</h3>
    <form id="formPlato" novalidate>
      ${Campo({ name: 'nombre', label: 'Nombre', value: plato?.nombre, placeholder: 'Ej: Mojarra frita' })}
      <div class="row g-3 align-items-end">
        ${Campo({ name: 'precio', label: 'Precio (COP)', type: 'number', value: plato?.precio, attrs: 'min="1" step="100"', col: 'col-sm-6' })}
        <div class="col-sm-6 mb-3"><div class="form-check">
          <input class="form-check-input" id="plActivo" name="activo" type="checkbox" ${!plato || plato.activo ? 'checked' : ''} />
          <label class="form-check-label" for="plActivo">Activo en el menú</label></div></div>
      </div>
      <h3>Receta (cantidad por plato)</h3>
      <div id="recetaFilas">${FilasReceta(receta, insumos)}</div>
      <div class="invalid-feedback d-block" data-error-de="receta"></div>
      <button class="btn btn-sinu w-100" type="button" id="btnAgregarInsumo">+ Agregar insumo</button>
      <div class="msg-error my-2" data-error-general></div>
      <div class="d-flex gap-2 flex-wrap">
        ${plato ? '<button class="btn btn-sinu" type="button" id="btnCancelarPlato">Cancelar edición</button>' : ''}
        <button class="btn btn-sinu" type="submit">${plato ? 'Guardar cambios' : 'Crear plato'}</button>
      </div>
    </form>
  `;
}

function estadoPlato(d) {
  if (!d.plato.activo) return tag('Inactivo', 'gris');
  if (d.disponible) return tag('Disponible', 'ok');
  return `${tag('No disponible', 'danger')}${d.limitante ? `<br /><small>Falta: ${escapeHtml(d.limitante)}</small>` : ''}`;
}

const COLUMNAS = [
  {
    titulo: 'Plato',
    render: (d) => `<b>${escapeHtml(d.plato.nombre)}</b><br /><small>${d.plato.receta
      .map((r) => `${escapeHtml(r.insumo)} ${formatNumber(r.cantidad)} ${r.unidad}`)
      .join(' · ')}</small>`,
  },
  { titulo: 'Precio', clase: 'num', render: (d) => formatCurrency(d.plato.precio) },
  { titulo: 'Posibles', clase: 'num', render: (d) => `<b>${d.posibles}</b>` },
  { titulo: 'Estado', render: estadoPlato },
  {
    titulo: '',
    render: (d) => `<div class="acciones">
      <button class="btn btn-sinu sm" type="button" data-editar="${d.plato.id}">Editar</button>
      <button class="btn btn-sinu sm peligro" type="button" data-eliminar="${d.plato.id}">Eliminar</button>
    </div>`,
  },
];

export function PlatosPage() {
  return `<section class="contenedor" id="platosRoot">${loading('Cargando platos…')}</section>`;
}

export function mountPlatosPage({ refreshAlertCount } = {}) {
  const root = document.querySelector('#platosRoot');
  let menu = [];
  let insumos = [];
  let editando = null;
  let receta = [{ insumo_id: null, cantidad: '' }];

  const platoEditado = () => menu.find((d) => d.plato.id === editando)?.plato ?? null;

  function pintar() {
    root.innerHTML = `
      <div class="cabecera-vista"><h2>Platos y recetas</h2></div>
      <div class="tarjeta">${Formulario(platoEditado(), receta, insumos)}</div>
      <div class="tarjeta"><h3>Menú y platos posibles</h3>${Tabla({ columnas: COLUMNAS, filas: menu, vacio: 'No hay platos. Cree el primero.' })}</div>
    `;
  }

  function pintarReceta() {
    root.querySelector('#recetaFilas').innerHTML = FilasReceta(receta, insumos);
  }

  function reiniciarFormulario() {
    editando = null;
    receta = [{ insumo_id: null, cantidad: '' }];
  }

  async function cargar() {
    try {
      const [respPlatos, respInsumos] = await Promise.all([getPlatos(), getInsumos()]);
      menu = respPlatos.data;
      insumos = respInsumos.data.map((f) => f.insumo);
      pintar();
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar los platos.');
      showApiError(error);
    }
  }

  // Mantiene `receta` sincronizada con lo que el usuario escribe
  root.addEventListener('input', (event) => {
    const { recetaInsumo, recetaCantidad } = event.target.dataset;
    if (recetaInsumo !== undefined) {
      receta[recetaInsumo].insumo_id = event.target.value ? Number(event.target.value) : null;
    } else if (recetaCantidad !== undefined) {
      receta[recetaCantidad].cantidad = event.target.value;
    }
  });

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const valores = leerFormulario(form);
    const errores = validar(valores, esquemaPlato);
    const errorReceta = validarReceta(receta);
    if (errorReceta) errores.receta = errorReceta;
    if (!esValido(errores)) {
      mostrarErrores(form, errores);
      return;
    }
    const payload = {
      nombre: valores.nombre,
      precio: Number(valores.precio),
      activo: valores.activo,
      receta: receta
        .filter((r) => r.insumo_id || r.cantidad !== '')
        .map((r) => ({ insumo_id: r.insumo_id, cantidad: Number(r.cantidad) })),
    };
    try {
      if (editando) {
        await updatePlato(editando, payload);
        toast('Plato actualizado.', 'ok');
      } else {
        await createPlato(payload);
        toast('Plato creado.', 'ok');
      }
      reiniciarFormulario();
      await cargar();
      refreshAlertCount?.();
    } catch (error) {
      mostrarErrorApi(form, error);
    }
  });

  root.addEventListener('click', async (event) => {
    const quitar = event.target.closest('[data-quitar]');
    const editar = event.target.closest('[data-editar]');
    const eliminar = event.target.closest('[data-eliminar]');

    if (event.target.closest('#btnAgregarInsumo')) {
      receta.push({ insumo_id: null, cantidad: '' });
      pintarReceta();
    } else if (quitar) {
      receta.splice(Number(quitar.dataset.quitar), 1);
      pintarReceta();
    } else if (event.target.closest('#btnCancelarPlato')) {
      reiniciarFormulario();
      pintar();
    } else if (editar) {
      editando = Number(editar.dataset.editar);
      receta = platoEditado().receta.map((r) => ({ insumo_id: r.insumo_id, cantidad: r.cantidad }));
      pintar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (eliminar) {
      const id = Number(eliminar.dataset.eliminar);
      const nombre = menu.find((d) => d.plato.id === id)?.plato.nombre ?? '';
      const ok = await confirmar(
        'Eliminar plato',
        `¿Eliminar <b>${escapeHtml(nombre)}</b> y su receta? Los pedidos anteriores se conservan.`,
        'Eliminar',
        true,
      );
      if (!ok) {
        return;
      }
      try {
        await deletePlato(id);
        if (editando === id) {
          reiniciarFormulario();
        }
        toast('Plato eliminado.', 'ok');
        await cargar();
        refreshAlertCount?.();
      } catch (error) {
        showApiError(error);
      }
    }
  });

  cargar();
}
