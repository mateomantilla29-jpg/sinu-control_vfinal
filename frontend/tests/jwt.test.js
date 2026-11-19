import { describe, expect, it } from 'vitest';
import { msRestantes, tokenExpiresAt } from '../src/js/utils/jwt.js';

const token = (payload) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.firma`;

describe('expiración del JWT (aviso de sesión)', () => {
  it('lee exp en milisegundos', () => {
    expect(tokenExpiresAt(token({ exp: 1000 }))).toBe(1_000_000);
  });

  it('calcula el tiempo restante y tolera tokens ilegibles', () => {
    expect(msRestantes(token({ exp: 100 }), 40_000)).toBe(60_000);
    expect(msRestantes('basura')).toBeNull();
  });
});
