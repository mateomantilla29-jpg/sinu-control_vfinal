// localStorage mínimo para Node (el store persiste la sesión ahí)
const datos = new Map();
globalThis.localStorage = {
  getItem: (k) => (datos.has(k) ? datos.get(k) : null),
  setItem: (k, v) => datos.set(k, String(v)),
  removeItem: (k) => datos.delete(k),
  clear: () => datos.clear(),
};
