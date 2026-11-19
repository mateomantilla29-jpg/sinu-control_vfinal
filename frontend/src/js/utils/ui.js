import { escapeHtml } from './formatters.js';

/* Utilidades de interfaz compartidas de SINU: toasts, etiquetas y estados vacíos. */

export function toast(message, tone = '') {
  const container = document.querySelector('#toasts');
  if (!container) {
    return;
  }

  const element = document.createElement('div');
  element.className = `toast-sinu ${tone}`;
  element.textContent = message;
  container.appendChild(element);
  setTimeout(() => element.remove(), tone === 'error' ? 4800 : 3000);
}

// Los modales viven en components/common/Modal.js; se re-exportan para las páginas existentes.
export { closeModal, confirmar, formModal, showInfoModal } from '../components/common/Modal.js';

export function tag(text, tone) {
  return `<span class="tag tag-${tone}">${escapeHtml(text)}</span>`;
}

export function empty(text) {
  return `<div class="vacio">${text}</div>`;
}

export function loading(text = 'Cargando…') {
  return `<div class="cargando"><div class="spinner-border spinner-border-sm me-2" role="status"></div>${escapeHtml(text)}</div>`;
}

export const TAG_PEDIDO = {
  pendiente: ['Pendiente', 'warn'],
  'en preparación': ['En preparación', 'info'],
  listo: ['Listo', 'ok'],
  entregado: ['Entregado', 'gris'],
  cancelado: ['Cancelado', 'danger'],
};

export function tagPedido(estado) {
  const [text, tone] = TAG_PEDIDO[estado] ?? [estado, 'gris'];
  return tag(text, tone);
}

/** Muestra el error de la API como toast. Devuelve el mensaje. */
export function showApiError(error, fallback = 'No fue posible completar la acción.') {
  const details = error?.details && typeof error.details === 'object'
    ? Object.values(error.details).flat(Infinity).filter((v) => typeof v === 'string').join(' ')
    : '';
  const message = details || error?.message || fallback;
  toast(message, 'error');
  return message;
}
