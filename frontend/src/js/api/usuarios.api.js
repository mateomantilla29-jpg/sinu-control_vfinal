import { request, send } from './http.js';

export function getUsuarios() {
  return request('/usuarios');
}

export function createUsuario(payload) {
  return send('/usuarios', 'POST', payload);
}

export function updateUsuario(id, payload) {
  return send(`/usuarios/${id}`, 'PUT', payload);
}

export function setUsuarioActivo(id, activo) {
  return send(`/usuarios/${id}/estado`, 'PATCH', { activo });
}
