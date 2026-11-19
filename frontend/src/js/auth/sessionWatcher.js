import { renewToken } from '../api/auth.api.js';
import { actions, getState } from '../state/store.js';
import { msRestantes } from '../utils/jwt.js';
import { toast } from '../utils/ui.js';

/*
 * Vigila la expiración del JWT (B6):
 *  · Faltando AVISO_MS muestra un aviso con el botón "Renovar sesión".
 *  · Renovar llama a POST /usuarios/token/renovar y guarda el token nuevo.
 *  · Si vence, cierra la sesión con un mensaje claro en el login (no "se cae" sin explicación).
 */
const AVISO_MS = 10 * 60 * 1000;
const REVISION_MS = 15 * 1000;

let timer = null;

function minutos(ms) {
  return Math.max(1, Math.ceil(ms / 60000));
}

function pintarAviso(restante) {
  const caja = document.querySelector('#avisoSesion');
  if (!caja) return;
  if (restante === null || restante > AVISO_MS) {
    caja.hidden = true;
    return;
  }
  caja.hidden = false;
  caja.innerHTML = `
    <span>⏳ Su sesión vence en <b>${minutos(restante)} min</b>. Renuévela para no perder lo que está haciendo.</span>
    <button class="btn btn-sinu sm" type="button" data-renovar-sesion>Renovar sesión</button>`;
}

export async function renovarSesion() {
  try {
    const resp = await renewToken();
    actions.renovarToken(resp.data.access_token);
    actions.actualizarUsuario(resp.data.usuario);
    pintarAviso(msRestantes(resp.data.access_token));
    toast('Sesión renovada.', 'ok');
    return true;
  } catch {
    return false; // http.js ya cerró la sesión si el token venció
  }
}

function revisar(onExpirada) {
  const { token } = getState().session;
  if (!token) return;
  const restante = msRestantes(token);
  if (restante !== null && restante <= 0) {
    actions.cerrarSesion('Su sesión expiró. Ingrese de nuevo para continuar.');
    onExpirada();
    return;
  }
  pintarAviso(restante);
}

export function iniciarVigilancia(onExpirada) {
  detenerVigilancia();
  revisar(onExpirada);
  timer = setInterval(() => revisar(onExpirada), REVISION_MS);
  document.addEventListener('click', clicRenovar);
}

export function detenerVigilancia() {
  clearInterval(timer);
  timer = null;
  document.removeEventListener('click', clicRenovar);
}

function clicRenovar(event) {
  if (event.target.closest('[data-renovar-sesion]')) {
    renovarSesion();
  }
}
