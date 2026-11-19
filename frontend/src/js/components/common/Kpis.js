/** Bloque de indicadores "concepto ··· valor". items: [{ texto, valor, color? }] */
export function Kpis(items) {
  return `<div class="kpis">${items
    .map(
      ({ texto, valor, color }) =>
        `<div class="kpi"><div class="t">${texto}</div><div class="v" ${color ? `style="color:var(--${color})"` : ''}>${valor}</div></div>`,
    )
    .join('')}</div>`;
}
