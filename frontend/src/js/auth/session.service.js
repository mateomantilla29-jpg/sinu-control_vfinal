import { actions, getState } from '../state/store.js';

/* Fachada de la sesión sobre el store (state/store.js). */

export function getToken() {
  return getState().session.token;
}

export function getUser() {
  return getState().session.user;
}

export function saveSession(token, user) {
  actions.iniciarSesion(token, user);
}

export function clearSession(aviso = '') {
  actions.cerrarSesion(aviso);
}

export function hasSession() {
  return Boolean(getToken());
}
