import { request } from './http.js';

function query(params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return qs.toString() ? `?${qs}` : '';
}

export function getMasVendidos({ desde, hasta }) {
  return request(`/reportes/mas-vendidos${query({ desde, hasta })}`);
}

export function getConsumoInsumos({ desde, hasta }) {
  return request(`/reportes/consumo-insumos${query({ desde, hasta })}`);
}

export function getMovimientos({ desde, hasta, tipo }) {
  return request(`/reportes/movimientos${query({ desde, hasta, tipo })}`);
}
