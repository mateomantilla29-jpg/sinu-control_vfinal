import { escapeHtml } from '../../utils/formatters.js';

/*
 * Campo de formulario con etiqueta y espacio para el error del campo.
 * `name` es el nombre del campo en el DTO de la API: así se pueden pintar
 * en el mismo sitio los errores del cliente y los `details` del servidor (400).
 */
export function Campo({ name, label, type = 'text', value = '', placeholder = '', help = '', attrs = '', opciones = null, col = '' }) {
  const id = `campo-${name}`;
  const control = opciones
    ? `<select class="form-select" id="${id}" name="${name}" ${attrs}>
        ${opciones.map((o) => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(value ?? '') ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
      </select>`
    : `<input class="form-control" id="${id}" name="${name}" type="${type}" value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(placeholder)}" ${attrs} />`;

  return `
    <div class="mb-3 ${col}">
      <label class="form-label" for="${id}">${escapeHtml(label)}</label>
      ${control}
      ${help ? `<div class="form-text">${escapeHtml(help)}</div>` : ''}
      <div class="invalid-feedback" data-error-de="${name}"></div>
    </div>`;
}

/** Lee los campos con `name` de un formulario como objeto { name: valor } (checkbox → boolean). */
export function leerFormulario(form) {
  const valores = {};
  form.querySelectorAll('[name]').forEach((el) => {
    valores[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return valores;
}

export function limpiarErrores(form) {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  form.querySelectorAll('[data-error-de]').forEach((el) => {
    el.textContent = '';
  });
  const general = form.querySelector('[data-error-general]');
  if (general) general.textContent = '';
}

/**
 * Pinta los errores por campo. Acepta { campo: 'msg' } (cliente) o { campo: ['msg'] } (API).
 * Los errores de campos que no están en el formulario van al bloque [data-error-general].
 * Devuelve true si había errores. Enfoca el primer campo con error.
 */
export function mostrarErrores(form, errores = {}) {
  limpiarErrores(form);
  const sueltos = [];
  let primero = null;

  const aplanar = (valor) =>
    Array.isArray(valor)
      ? valor.flatMap(aplanar)
      : valor && typeof valor === 'object'
        ? Object.values(valor).flatMap(aplanar)
        : [String(valor)];

  for (const [campo, valor] of Object.entries(errores ?? {})) {
    const mensaje = aplanar(valor).join(' ');
    const control = form.querySelector(`[name="${campo}"]`);
    const destino = form.querySelector(`[data-error-de="${campo}"]`);
    if (destino) {
      // Campos compuestos (p. ej. la receta) tienen zona de error pero no un único control
      destino.textContent = mensaje;
      if (control) {
        control.classList.add('is-invalid');
        primero ??= control;
      }
    } else {
      sueltos.push(mensaje);
    }
  }

  const general = form.querySelector('[data-error-general]');
  if (general && sueltos.length) general.textContent = sueltos.join(' ');
  primero?.focus();
  return Object.keys(errores ?? {}).length > 0;
}

/** Muestra el error de la API: detalles por campo si los hay, si no el mensaje general. */
export function mostrarErrorApi(form, error) {
  const details = error?.details;
  if (details && typeof details === 'object' && Object.keys(details).length) {
    mostrarErrores(form, details);
    return;
  }
  limpiarErrores(form);
  const general = form.querySelector('[data-error-general]');
  if (general) general.textContent = error?.message ?? 'No fue posible completar la acción.';
}
