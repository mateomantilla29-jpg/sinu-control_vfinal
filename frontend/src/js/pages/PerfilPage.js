import { changePassword, getCurrentUserProfile, updateProfile } from '../api/auth.api.js';
import { renovarSesion } from '../auth/sessionWatcher.js';
import { Campo, leerFormulario, limpiarErrores, mostrarErrorApi, mostrarErrores } from '../components/common/Campo.js';
import { Kpis } from '../components/common/Kpis.js';
import { actions, getState } from '../state/store.js';
import { escapeHtml, formatTime } from '../utils/formatters.js';
import { tokenExpiresAt } from '../utils/jwt.js';
import { empty, loading, showApiError, toast } from '../utils/ui.js';
import { esquemaContrasena, esquemaPerfil, esValido, validar } from '../utils/validators.js';

export function PerfilPage() {
  return `<section class="contenedor" id="perfilRoot">${loading('Cargando perfil…')}</section>`;
}

function vence() {
  const exp = tokenExpiresAt(getState().session.token);
  return exp ? formatTime(new Date(exp).toISOString()) : '—';
}

export function mountPerfilPage() {
  const root = document.querySelector('#perfilRoot');
  let abierto = false; // los formularios de modificación arrancan cerrados

  function mostrarFormularios(mostrar) {
    abierto = mostrar;
    root.querySelector('#perfilEdicion')?.toggleAttribute('hidden', !mostrar);
    root.querySelector('#btnModificar')?.toggleAttribute('hidden', mostrar);
  }

  async function cargar() {
    try {
      const usuario = (await getCurrentUserProfile()).data;
      actions.actualizarUsuario(usuario);
      root.innerHTML = `
        <div class="cabecera-vista"><h2>Mi perfil</h2></div>
        ${Kpis([
          { texto: 'Usuario de acceso', valor: escapeHtml(usuario.usuario) },
          { texto: 'Rol', valor: escapeHtml(usuario.rol_nombre) },
          { texto: 'La sesión vence a las', valor: `<span id="perfilVence">${vence()}</span>` },
        ])}
        <div class="acciones mb-3">
          <button class="btn btn-sinu" type="button" id="btnModificar" ${abierto ? 'hidden' : ''}>Modificar</button>
          <button class="btn btn-sinu contorno" type="button" id="btnRenovar">Renovar sesión</button>
        </div>
        <div class="form-desplegable" id="perfilEdicion" ${abierto ? '' : 'hidden'}>
        <div class="dos-col">
          <div class="tarjeta">
            <h3>Datos</h3>
            <form id="formPerfil" novalidate>
              ${Campo({ name: 'nombre', label: 'Nombre visible', value: usuario.nombre })}
              <div class="msg-error mb-2" data-error-general></div>
              <div class="acciones">
                <button class="btn btn-sinu" type="submit">Guardar nombre</button>
              </div>
            </form>
          </div>
          <div class="tarjeta" id="contrasena">
            <h3>Cambiar contraseña</h3>
            <form id="formClave" novalidate>
              ${Campo({ name: 'actual', label: 'Contraseña actual', type: 'password', attrs: 'autocomplete="current-password"' })}
              ${Campo({ name: 'nueva', label: 'Nueva contraseña', type: 'password', attrs: 'autocomplete="new-password"', help: 'Mínimo 6 caracteres, distinta de la actual.' })}
              ${Campo({ name: 'confirmacion', label: 'Confirmar nueva contraseña', type: 'password', attrs: 'autocomplete="new-password"' })}
              <div class="msg-error mb-2" data-error-general></div>
              <button class="btn btn-sinu" type="submit">Cambiar contraseña</button>
            </form>
          </div>
        </div>
        <div class="acciones mt-3"><button class="btn btn-sinu sobrio" type="button" id="btnCerrarEdicion">Cancelar</button></div>
        </div>`;
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar el perfil.');
      showApiError(error);
    }
  }

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'formPerfil') {
      const valores = leerFormulario(form);
      const errores = validar(valores, esquemaPerfil);
      if (!esValido(errores)) return mostrarErrores(form, errores);
      try {
        actions.actualizarUsuario((await updateProfile(valores)).data);
        toast('Perfil actualizado.', 'ok');
        abierto = false;
        await cargar();
      } catch (error) {
        mostrarErrorApi(form, error);
      }
    } else if (form.id === 'formClave') {
      const valores = {};
      form.querySelectorAll('[name]').forEach((el) => (valores[el.name] = el.value)); // sin recortar espacios
      const errores = validar(valores, esquemaContrasena);
      if (!esValido(errores)) return mostrarErrores(form, errores);
      try {
        await changePassword(valores);
        form.reset();
        limpiarErrores(form);
        toast('Contraseña actualizada. Úsela en su próximo ingreso.', 'ok');
        mostrarFormularios(false);
      } catch (error) {
        mostrarErrorApi(form, error);
      }
    }
    return undefined;
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('#btnModificar')) {
      mostrarFormularios(true);
      root.querySelector('[name="nombre"]')?.focus();
      return;
    }
    if (event.target.closest('#btnCerrarEdicion')) {
      root.querySelectorAll('#perfilEdicion form').forEach((f) => {
        f.reset();
        limpiarErrores(f);
      });
      mostrarFormularios(false);
      return;
    }
    if (event.target.closest('#btnRenovar') && (await renovarSesion())) {
      const span = root.querySelector('#perfilVence');
      if (span) span.textContent = vence();
    }
  });

  cargar();
}
