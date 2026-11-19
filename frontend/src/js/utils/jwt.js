/** Lee el `exp` (segundos) del payload de un JWT sin verificar la firma (eso lo hace la API). */
export function tokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Milisegundos que le quedan al token (negativo = vencido, null = ilegible). */
export function msRestantes(token, ahora = Date.now()) {
  const exp = tokenExpiresAt(token);
  return exp === null ? null : exp - ahora;
}
