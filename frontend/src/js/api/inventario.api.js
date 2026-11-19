import { request, send } from './http.js';

export function getInsumos() {
  return request('/insumos');
}

export function createInsumo(payload) {
  return send('/insumos', 'POST', payload);
}

export function updateInsumo(id, payload) {
  return send(`/insumos/${id}`, 'PUT', payload);
}

export function deleteInsumo(id) {
  return send(`/insumos/${id}`, 'DELETE');
}

export function getLotes({ todos = false } = {}) {
  return request(`/lotes${todos ? '?todos=1' : ''}`);
}

export function createLote(payload) {
  return send('/lotes', 'POST', payload);
}

export function registrarMerma(loteId, payload) {
  return send(`/lotes/${loteId}/merma`, 'POST', payload);
}

export function darDeBajaLote(loteId) {
  return send(`/lotes/${loteId}/baja`, 'POST');
}

export function darDeBajaVencidos() {
  return send('/lotes/vencidos/baja', 'POST');
}
