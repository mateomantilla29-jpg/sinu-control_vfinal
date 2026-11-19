import logoUrl from '../../assets/logo-sinu.jpg';
import { login } from '../api/auth.api.js';
import { saveSession } from '../auth/session.service.js';
import { Campo, leerFormulario, mostrarErrores } from '../components/common/Campo.js';
import { actions } from '../state/store.js';
import { formatApiError } from '../utils/errorMessages.js';
import { escapeHtml } from '../utils/formatters.js';
import { esquemaLogin, esValido, validar } from '../utils/validators.js';

export function LoginPage() {
  const aviso = actions.consumirAvisoLogin();
  return `
    <section class="pantalla-login">
      <div class="login-caja">
        <img class="login-logo" src="${logoUrl}" alt="Logo Gastrobar Sinu" />
        <div class="login-titulo">SINU CONTROL</div>
        <div class="login-sub">Pedidos, cocina e inventario por lotes · Gastrobar Sinu, Bello</div>
        <div class="roles" role="group" aria-label="Seleccione su rol">
          <button type="button" class="rol-card" data-usuario="admin" aria-pressed="false">
            <span class="ico">⚙️</span><span class="nom">Administrador</span><small>Gestión completa</small>
          </button>
          <button type="button" class="rol-card" data-usuario="mesero" aria-pressed="false">
            <span class="ico">🧾</span><span class="nom">Mesero</span><small>Toma de pedidos</small>
          </button>
        </div>
        <form class="login-form" id="loginForm" novalidate>
          ${aviso ? `<div class="aviso-login" role="alert">⏳ ${escapeHtml(aviso)}</div>` : ''}
          ${Campo({ name: 'usuario', label: 'Usuario', attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false"' })}
          ${Campo({ name: 'contrasena', label: 'Contraseña', type: 'password', attrs: 'autocomplete="current-password"' })}
          <div class="msg-error text-center mb-2" data-error-general role="alert"></div>
          <button class="btn btn-sinu xl w-100" type="submit" id="btnIngresar">Ingresar</button>
        </form>
        <p class="muted small mt-3">Los datos se guardan en el servidor de Sinu Control (API + MySQL).</p>
      </div>
    </section>
  `;
}

export function mountLoginPage({ navigate } = {}) {
  const form = document.querySelector('#loginForm');
  const usuario = form.querySelector('[name="usuario"]');
  const clave = form.querySelector('[name="contrasena"]');
  const boton = document.querySelector('#btnIngresar');
  const tarjetas = document.querySelectorAll('.rol-card');

  // Selección rápida de rol: rellena el usuario y pasa el foco a la contraseña
  tarjetas.forEach((card) => {
    card.addEventListener('click', () => {
      tarjetas.forEach((other) => {
        const selected = other === card;
        other.classList.toggle('sel', selected);
        other.setAttribute('aria-pressed', String(selected));
      });
      usuario.value = card.dataset.usuario;
      mostrarErrores(form, {});
      clave.focus();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const valores = leerFormulario(form);
    valores.contrasena = clave.value; // la contraseña no se recorta

    const errores = validar(valores, esquemaLogin);
    if (!esValido(errores)) {
      mostrarErrores(form, errores);
      return;
    }

    boton.disabled = true;
    try {
      const response = await login({ usuario: valores.usuario.toLowerCase(), contrasena: valores.contrasena });
      saveSession(response.data.access_token, response.data.usuario);
      navigate?.('login'); // el router redirige a la vista inicial del rol
    } catch (apiError) {
      const formatted = formatApiError(apiError, 'No fue posible iniciar sesión.');
      mostrarErrores(form, {
        _general: formatted.status === 401 ? formatted.message || 'Usuario o contraseña incorrectos.' : formatted.message,
      });
      clave.value = '';
      clave.focus();
    } finally {
      boton.disabled = false;
    }
  });

  setTimeout(() => usuario.focus(), 50);
}
