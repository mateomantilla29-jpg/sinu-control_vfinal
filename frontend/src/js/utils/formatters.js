const numberFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });
const currencyFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

export function formatCurrency(value) {
  const numericValue = Number(value ?? 0);
  return currencyFormat.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatNumber(value) {
  return numberFormat.format(Number(value ?? 0));
}

/** Fecha local AAAA-MM-DD de hoy (para los campos type="date"). */
export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 15/10/2026 (dd/mm/aaaa, solo números) */
export function formatDate(iso) {
  const d = parseIsoDate(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 07:45 p. m. */
export function formatTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/** Días desde hoy hasta la fecha (negativo = ya pasó). */
export function daysUntil(iso) {
  return Math.round((parseIsoDate(iso) - parseIsoDate(todayIso())) / 86400000);
}
