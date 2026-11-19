import { AlertasPage, mountAlertasPage } from '../pages/AlertasPage.js';
import { CajaPage, mountCajaPage } from '../pages/CajaPage.js';
import { CocinaPage, mountCocinaPage } from '../pages/CocinaPage.js';
import { InventarioPage, mountInventarioPage } from '../pages/InventarioPage.js';
import { LoginPage, mountLoginPage } from '../pages/LoginPage.js';
import { LotesPage, mountLotesPage } from '../pages/LotesPage.js';
import { MermasPage, mountMermasPage } from '../pages/MermasPage.js';
import { MesasPage, mountMesasPage } from '../pages/MesasPage.js';
import { PerfilPage, mountPerfilPage } from '../pages/PerfilPage.js';
import { PlatosPage, mountPlatosPage } from '../pages/PlatosPage.js';
import { ReportesPage, mountReportesPage } from '../pages/ReportesPage.js';
import { TableroPage, mountTableroPage } from '../pages/TableroPage.js';
import { UsuariosPage, mountUsuariosPage } from '../pages/UsuariosPage.js';

/*
 * Cada ruta: path, page (HTML inicial), mount (eventos y carga de datos).
 * `public` = sin sesión. El resto se valida con ROLES[rol].vistas (ver permissions.js).
 * mount puede devolver una función de limpieza (p. ej. detener cronómetros).
 */
const routeList = [
  { path: 'login', aliases: [''], public: true, page: LoginPage, mount: mountLoginPage },
  { path: 'tablero', page: TableroPage, mount: mountTableroPage },
  { path: 'mesas', page: MesasPage, mount: mountMesasPage },
  { path: 'cocina', page: CocinaPage, mount: mountCocinaPage },
  { path: 'platos', page: PlatosPage, mount: mountPlatosPage },
  { path: 'inventario', page: InventarioPage, mount: mountInventarioPage },
  { path: 'lotes', page: LotesPage, mount: mountLotesPage },
  { path: 'mermas', page: MermasPage, mount: mountMermasPage },
  { path: 'reportes', page: ReportesPage, mount: mountReportesPage },
  { path: 'caja', page: CajaPage, mount: mountCajaPage },
  { path: 'usuarios', page: UsuariosPage, mount: mountUsuariosPage },
  { path: 'alertas', page: AlertasPage, mount: mountAlertasPage },
  { path: 'perfil', page: PerfilPage, mount: mountPerfilPage },
];

export function normalizeRouteView(view) {
  const normalized = String(view ?? 'login')
    .trim()
    .replace(/^#/, '')
    .replace(/^\/+|\/+$/g, '');

  return normalized || 'login';
}

export function getRoute(view) {
  const normalizedView = normalizeRouteView(view);
  const route = routeList.find(
    (item) => item.path === normalizedView || item.aliases?.includes(normalizedView),
  );

  return route ? { ...route } : null;
}
