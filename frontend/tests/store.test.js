import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, getState, subscribe } from '../src/js/state/store.js';

describe('store (gestión de estado)', () => {
  beforeEach(() => actions.cerrarSesion());

  it('iniciar y cerrar sesión persiste y limpia el token', () => {
    actions.iniciarSesion('tok-1', { id: 1, rol: 'admin' });
    expect(getState().session.user.rol).toBe('admin');
    expect(JSON.parse(localStorage.getItem('sinu_control_access_token'))).toBe('tok-1');

    actions.cerrarSesion('Su sesión expiró.');
    expect(getState().session.token).toBeNull();
    expect(localStorage.getItem('sinu_control_access_token')).toBeNull();
    expect(actions.consumirAvisoLogin()).toBe('Su sesión expiró.');
    expect(getState().avisoLogin).toBe('');
  });

  it('los carritos por mesa se borran al cerrar sesión', () => {
    actions.setCarrito('3', [{ plato_id: 1, cantidad: 2 }]);
    expect(getState().carritos['3']).toHaveLength(1);
    actions.cerrarSesion();
    expect(getState().carritos).toEqual({});
  });

  it('subscribe con selector solo avisa cuando cambia ese valor', () => {
    const listener = vi.fn();
    const cancelar = subscribe(listener, (s) => s.alertasActivas);
    actions.setView('mesas');
    expect(listener).not.toHaveBeenCalled();
    actions.setAlertasActivas(7);
    expect(listener).toHaveBeenCalledWith(7, expect.anything());
    cancelar();
    actions.setAlertasActivas(8);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
