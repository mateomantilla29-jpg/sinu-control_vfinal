import logoUrl from '../../../assets/logo-sinu.jpg';
import { getCurrentUser, NOMBRES_VISTA, ROLES } from '../../auth/permissions.js';
import { getState } from '../../state/store.js';
import { escapeHtml } from '../../utils/formatters.js';

function tabButton(view, currentView) {
  const active = view === currentView ? 'activa' : '';
  return `<button type="button" class="${active}" data-view="${view}">${NOMBRES_VISTA[view]}</button>`;
}

function menuItem({ action, view, ico, text, badge = false }) {
  const destino = view ? `data-view="${view}"` : `data-action="${action}"`;
  const cantidad = getState().alertasActivas;
  return `
    <li><button class="dropdown-item" type="button" ${destino}>
      <span aria-hidden="true">${ico}</span>${text}
      ${badge ? `<span class="badge-alertas ${cantidad ? '' : 'cero'}" data-contador-alertas>${cantidad}</span>` : ''}
    </button></li>`;
}

/** Encabezado SINU: logo, marca, menú de usuario con alertas y pestañas del rol. */
export function Navbar(currentView) {
  const user = getCurrentUser();
  const role = ROLES[user?.rol];

  if (!user || !role) {
    return '';
  }

  const items = [
    { action: 'alertas', ico: '🔔', text: 'Alertas', badge: true },
    { view: 'perfil', ico: '👤', text: 'Mi perfil y contraseña' },
  ];
  const cantidad = getState().alertasActivas;

  return `
    <header class="barra">
      <div class="barra-sup">
        <img src="${logoUrl}" alt="Logo Gastrobar Sinu" />
        <div class="marca">Sinu Control<small>Gastrobar · Bello</small></div>
        <div class="flex-grow-1"></div>
        <div class="dropdown">
          <button class="btn btn-sinu btn-usuario dropdown-toggle" type="button" data-bs-toggle="dropdown"
            aria-expanded="false" title="Menú de usuario">
            <span aria-hidden="true">${role.ico}</span>${escapeHtml(role.nombre)}
            <span class="badge-alertas ${cantidad ? '' : 'cero'}" data-contador-alertas aria-label="alertas activas">${cantidad}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end menu-usuario">
            <li class="menu-cab"><b>${escapeHtml(user.nombre)}</b><br /><small>Usuario: ${escapeHtml(user.usuario)}</small></li>
            ${items.map(menuItem).join('')}
            <li><hr class="dropdown-divider" /></li>
            <li><button class="dropdown-item salir" type="button" data-action="logout">
              <span aria-hidden="true">⎋</span>Cerrar sesión
            </button></li>
          </ul>
        </div>
      </div>
      ${
        role.pestanas.length
          ? `<nav class="tabs" aria-label="Secciones">${role.pestanas.map((view) => tabButton(view, currentView)).join('')}</nav>`
          : ''
      }
    </header>
    <div id="avisoSesion" class="aviso-sesion" role="status" aria-live="polite" hidden></div>
  `;
}

export function Leyenda() {
  return `
    <footer class="leyenda-botones" aria-label="Leyenda de botones">
      <span><span class="muestra muestra-on"></span>Dorado: acción disponible</span>
      <span><span class="muestra muestra-off"></span>Gris: no disponible en este momento (pase el cursor para ver el motivo)</span>
      <span><span class="muestra muestra-peligro"></span>Rojo: acción destructiva (pide confirmación)</span>
    </footer>
  `;
}
