import { Campo } from './Campo.js';

/** Formulario de rango de fechas (reportes). Se envía con el botón "Consultar". */
export function FiltroFechas({ desde, hasta, extra = '' }) {
  return `
    <form id="formFiltro" class="row g-2 align-items-end" novalidate>
      ${Campo({ name: 'desde', label: 'Desde', type: 'date', value: desde, col: 'col-sm-4 mb-0' })}
      ${Campo({ name: 'hasta', label: 'Hasta', type: 'date', value: hasta, col: 'col-sm-4 mb-0' })}
      ${extra}
      <div class="col-sm-4 mb-3"><button class="btn btn-sinu w-100" type="submit">Consultar</button></div>
      <div class="msg-error col-12" data-error-general></div>
    </form>`;
}
