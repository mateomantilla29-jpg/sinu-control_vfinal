import { request, send } from './http.js';

export function login(payload) {
  return send('/usuarios/login', 'POST', payload);
}

export function getCurrentUserProfile() {
  return request('/usuarios/yo');
}

export function updateProfile(payload) {
  return send('/usuarios/yo', 'PUT', payload);
}

export function changePassword(payload) {
  return send('/usuarios/yo/contrasena', 'PATCH', payload);
}

export function renewToken() {
  return send('/usuarios/token/renovar', 'POST');
}
