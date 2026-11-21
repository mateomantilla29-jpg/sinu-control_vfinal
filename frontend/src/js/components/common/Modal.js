import { escapeHtml } from '../../utils/formatters.js';

/* Ventanas modales propias de SINU (confirmación, información y formulario). */

const raiz = () => document.querySelector('#modalRaiz');

export function closeModal() {
  raiz().innerHTML = '';
}

/**
 * Confirmación antes de acciones destructivas o irreversibles.
 * `messageHtml` puede llevar <b>; todo dato del usuario debe ir escapado.
 */
export function confirmar(title, messageHtml, okText = 'Confirmar', danger = false, cancelText = 'Volver') {
  return new Promise((resolve) => {
    raiz().innerHTML = `
      <div class="modal-fondo">
        <div class="modal-sinu" role="dialog" aria-modal="true" aria-labelledby="confirmTitulo">
          <h2 id="confirmTitulo">${escapeHtml(title)}</h2>
          <p>${messageHtml}</p>
          <div class="botones">
            <button class="btn btn-sinu sobrio" type="button" data-respuesta="no">${escapeHtml(cancelText)}</button>
            <button class="btn btn-sinu ${danger ? 'peligro' : ''}" type="button" data-respuesta="si">${escapeHtml(okText)}</button>
          </div>
        </div>
      </div>
    `;

    raiz().querySelectorAll('[data-respuesta]').forEach((button) => {
      button.addEventListener('click', () => {
        closeModal();
        resolve(button.dataset.respuesta === 'si');
      });
    });
    raiz().querySelector('[data-respuesta="si"]').focus();
  });
}

/** Ventana informativa que se cierra con el botón, con Escape o al hacer clic fuera. */
export function showInfoModal(innerHtml, { wide = false } = {}) {
  raiz().innerHTML = `
    <div class="modal-fondo" data-cerrable>
      <div class="modal-sinu ${wide ? 'ancho' : ''}" role="dialog" aria-modal="true">
        ${innerHtml}
        <div class="botones"><button class="btn btn-sinu" type="button" data-cerrar>Cerrar</button></div>
      </div>
    </div>
  `;

  const fondo = raiz().querySelector('.modal-fondo');
  fondo.addEventListener('click', (event) => {
    if (event.target === fondo || event.target.closest('[data-cerrar]')) {
      closeModal();
    }
  });
}

/**
 * Modal con formulario. `onSubmit(form)` se llama al enviar; si devuelve true el modal se cierra.
 * Se usa para editar usuarios y registrar mermas.
 */
export function formModal({ titulo, cuerpoHtml, textoOk = 'Guardar', peligro = false, onSubmit }) {
  raiz().innerHTML = `
    <div class="modal-fondo" data-cerrable>
      <div class="modal-sinu ancho" role="dialog" aria-modal="true" aria-labelledby="formModalTitulo">
        <h2 id="formModalTitulo">${escapeHtml(titulo)}</h2>
        <form id="formModal" novalidate>
          ${cuerpoHtml}
          <div class="msg-error" data-error-general></div>
          <div class="botones">
            <button class="btn btn-sinu sobrio" type="button" data-cerrar>Volver</button>
            <button class="btn btn-sinu ${peligro ? 'peligro' : ''}" type="submit">${escapeHtml(textoOk)}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  const form = raiz().querySelector('#formModal');
  raiz().querySelector('[data-cerrar]').addEventListener('click', closeModal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const boton = form.querySelector('[type="submit"]');
    boton.disabled = true;
    try {
      if (await onSubmit(form)) closeModal();
    } finally {
      boton.disabled = false;
    }
  });
  form.querySelector('input, select, textarea')?.focus();
  return form;
}
