import { registrarMerma } from '../../api/inventario.api.js';
import { escapeHtml, formatNumber } from '../../utils/formatters.js';
import { toast } from '../../utils/ui.js';
import { esquemaMerma, esValido, validar } from '../../utils/validators.js';
import { Campo, leerFormulario, mostrarErrorApi, mostrarErrores } from '../common/Campo.js';
import { formModal } from '../common/Modal.js';

/** Modal reutilizable (Lotes y Mermas) para registrar la merma parcial de un lote. */
export function abrirMermaModal(lote, onListo) {
  formModal({
    titulo: `Registrar merma · ${lote.codigo}`,
    textoOk: 'Registrar merma',
    peligro: true,
    cuerpoHtml: `
      <p><b>${escapeHtml(lote.insumo)}</b>: quedan <b>${formatNumber(lote.cantidad_actual)} ${lote.unidad}</b> en este lote.</p>
      ${Campo({ name: 'cantidad', label: `Cantidad a descontar (${lote.unidad})`, type: 'number', attrs: `min="0" step="0.01" max="${lote.cantidad_actual}"` })}
      ${Campo({ name: 'motivo', label: 'Motivo', placeholder: 'Ej: se cayó en la cocina, mal estado' })}
    `,
    onSubmit: async (form) => {
      const valores = leerFormulario(form);
      const errores = validar(valores, esquemaMerma(lote.cantidad_actual));
      if (!esValido(errores)) {
        mostrarErrores(form, errores);
        return false;
      }
      try {
        const resp = await registrarMerma(lote.id, { cantidad: Number(valores.cantidad), motivo: valores.motivo });
        toast(resp.message, 'ok');
        await onListo?.();
        return true;
      } catch (error) {
        mostrarErrorApi(form, error);
        return false;
      }
    },
  });
}
