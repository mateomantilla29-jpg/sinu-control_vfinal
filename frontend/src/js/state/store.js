import { getItem, removeItem, saveItem } from '../utils/storage.js';

/*
 * Estado global de la SPA (patrón store + suscriptores, sin librerías).
 *
 * Dónde vive cada dato:
 *  · session      → token JWT y usuario (se persiste en localStorage para sobrevivir a F5)
 *  · currentView  → vista que se está mostrando (la refleja el #hash de la URL)
 *  · carritos     → borradores de pedido por mesa (solo en memoria, se pierden al cerrar sesión)
 *  · alertasActivas → número que muestran los contadores del menú
 *  · avisoLogin   → mensaje para el login (p. ej. "su sesión expiró")
 *
 * Las páginas leen con getState(), cambian con las acciones y reaccionan con subscribe().
 */

const TOKEN_KEY = 'sinu_control_access_token';
const USER_KEY = 'sinu_control_user';

const listeners = new Set();

let state = {
  session: { token: getItem(TOKEN_KEY), user: getItem(USER_KEY) },
  currentView: 'login',
  carritos: {},
  alertasActivas: 0,
  avisoLogin: '',
};

export function getState() {
  return state;
}

/** Mezcla `cambios` en el estado y avisa a los suscriptores con (nuevo, anterior). */
export function setState(cambios) {
  const anterior = state;
  state = { ...state, ...cambios };
  listeners.forEach((listener) => listener(state, anterior));
}

/**
 * Suscribe `listener`. Con `selector`, solo se llama cuando cambia el valor elegido.
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribe(listener, selector = null) {
  const envoltura = selector
    ? (nuevo, anterior) => {
        if (selector(nuevo) !== selector(anterior)) listener(selector(nuevo), nuevo);
      }
    : listener;
  listeners.add(envoltura);
  return () => listeners.delete(envoltura);
}

// ---------------- Acciones ----------------

export const actions = {
  iniciarSesion(token, user) {
    saveItem(TOKEN_KEY, token);
    saveItem(USER_KEY, user);
    setState({ session: { token, user }, avisoLogin: '' });
  },

  renovarToken(token) {
    saveItem(TOKEN_KEY, token);
    setState({ session: { ...state.session, token } });
  },

  actualizarUsuario(user) {
    saveItem(USER_KEY, user);
    setState({ session: { ...state.session, user } });
  },

  /** Cierra la sesión. `aviso` se muestra en la pantalla de login. */
  cerrarSesion(aviso = '') {
    removeItem(TOKEN_KEY);
    removeItem(USER_KEY);
    setState({ session: { token: null, user: null }, carritos: {}, alertasActivas: 0, avisoLogin: aviso });
  },

  setView(view) {
    setState({ currentView: view });
  },

  setCarrito(mesa, items) {
    setState({ carritos: { ...state.carritos, [mesa]: items } });
  },

  setAlertasActivas(cantidad) {
    setState({ alertasActivas: cantidad });
  },

  consumirAvisoLogin() {
    const aviso = state.avisoLogin;
    if (aviso) setState({ avisoLogin: '' });
    return aviso;
  },
};
