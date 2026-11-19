import { empty } from '../../utils/ui.js';

/**
 * Tabla genérica con el estilo SINU.
 * columnas: [{ titulo, clase?: 'num', render: (fila) => html }]
 * pie: filas de totales opcionales ([html por columna]).
 */
export function Tabla({ columnas, filas, vacio = 'No hay datos.', pie = null }) {
  if (!filas.length) {
    return empty(vacio);
  }
  const celdaPie = (html, i) => `<td class="${columnas[i]?.clase ?? ''}"><b>${html ?? ''}</b></td>`;
  return `<div class="tabla-wrap"><table>
    <thead><tr>${columnas.map((c) => `<th class="${c.clase ?? ''}">${c.titulo}</th>`).join('')}</tr></thead>
    <tbody>${filas
      .map((fila) => `<tr>${columnas.map((c) => `<td class="${c.clase ?? ''}">${c.render(fila)}</td>`).join('')}</tr>`)
      .join('')}</tbody>
    ${pie ? `<tfoot><tr class="fila-total">${pie.map(celdaPie).join('')}</tr></tfoot>` : ''}
  </table></div>`;
}
