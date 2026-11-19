import { request, send } from './http.js';

export function getResumenCaja(fecha) {
  return request(`/caja/resumen${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''}`);
}

export function cerrarCaja(payload) {
  return send('/caja/cierres', 'POST', payload);
}

export function getCierres() {
  return request('/caja/cierres');
}
