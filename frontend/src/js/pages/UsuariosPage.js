import { createUsuario, getUsuarios, setUsuarioActivo, updateUsuario } from '../api/usuarios.api.js';
import { getCurrentUser } from '../auth/permissions.js';
import { Campo, leerFormulario, mostrarErrorApi, mostrarErrores } from '../components/common/Campo.js';
import { formModal } from '../components/common/Modal.js';
import { Tabla } from '../components/common/Tabla.js';
import { escapeHtml, formatDate } from '../utils/formatters.js';
import { confirmar, empty, loading, showApiError, tag, toast } from '../utils/ui.js';
import { esquemaUsuarioEditar, esquemaUsuarioNuevo, esValido, validar } from '../utils/validators.js';

const OPCIONES_ROL = [
  { value: 'mesero', label: 'Mesero' },
  { value: 'admin', label: 'Administrador' },
];

function FormularioNuevo() {
  return `
    <h3>Nuevo usuario</h3>
    <form id="formUsuario" novalidate>
      <div class="row g-3">
        ${Campo({ name: 'usuario', label: 'Usuario de acceso', placeholder: 'Ej: ana.perez', attrs: 'autocapitalize="none" spellcheck="false" autocomplete="off"', help: 'Minúsculas, números, punto, guion o guion bajo.', col: 'col-sm-6' })}
        ${Campo({ name: 'nombre', label: 'Nombre visible', placeholder: 'Ej: Ana Pérez', col: 'col-sm-6' })}
        ${Campo({ name: 'rol', label: 'Rol', value: 'mesero', opciones: OPCIONES_ROL, col: 'col-sm-6' })}
        ${Campo({ name: 'contrasena', label: 'Contraseña inicial', type: 'password', attrs: 'autocomplete="new-password"', help: 'Mínimo 6 caracteres.', col: 'col-sm-6' })}
      </div>
      <div class="msg-error mb-2" data-error-general></div>
      <button class="btn btn-sinu" type="submit">Crear usuario</button>
    </form>`;
}

function columnas(miId) {
  return [
    { titulo: 'Usuario', render: (u) => `<b>${escapeHtml(u.usuario)}</b>${u.id === miId ? ` ${tag('Usted', 'info')}` : ''}<br /><small>${escapeHtml(u.nombre)}</small>` },
    { titulo: 'Rol', render: (u) => escapeHtml(u.rol_nombre) },
    { titulo: 'Estado', render: (u) => (u.activo ? tag('Activo', 'ok') : tag('Desactivado', 'gris')) },
    { titulo: 'Creado', render: (u) => (u.fecha_creacion ? formatDate(u.fecha_creacion) : '—') },
    {
      titulo: '',
      render: (u) => `<div class="acciones">
        <button class="btn btn-sinu sm" type="button" data-editar="${u.id}">Editar</button>
        ${
          u.id === miId
            ? ''
            : u.activo
              ? `<button class="btn btn-sinu sm peligro" type="button" data-estado="${u.id}" data-activo="false">Desactivar</button>`
              : `<button class="btn btn-sinu sm" type="button" data-estado="${u.id}" data-activo="true">Activar</button>`
        }
      </div>`,
    },
  ];
}

export function UsuariosPage() {
  return `<section class="contenedor" id="usuariosRoot">${loading('Cargando usuarios…')}</section>`;
}

export function mountUsuariosPage() {
  const root = document.querySelector('#usuariosRoot');
  const miId = getCurrentUser()?.id;
  let usuarios = [];

  async function cargar() {
    try {
      usuarios = (await getUsuarios()).data;
      root.innerHTML = `
        <div class="cabecera-vista"><h2>Usuarios</h2><small>Solo el Administrador gestiona las cuentas</small></div>
        <div class="tarjeta">${FormularioNuevo()}</div>
        <div class="tarjeta"><h3>Cuentas</h3>
          <p class="muted">Un usuario desactivado no puede iniciar sesión y su sesión abierta deja de funcionar. Nadie puede desactivarse a sí mismo y siempre queda al menos un Administrador activo.</p>
          ${Tabla({ columnas: columnas(miId), filas: usuarios, vacio: 'No hay usuarios.' })}
        </div>`;
    } catch (error) {
      root.innerHTML = empty('No fue posible cargar los usuarios.');
      showApiError(error);
    }
  }

  function editar(usuario) {
    formModal({
      titulo: `Editar usuario · ${usuario.usuario}`,
      cuerpoHtml: `
        ${Campo({ name: 'nombre', label: 'Nombre visible', value: usuario.nombre })}
        ${Campo({ name: 'rol', label: 'Rol', value: usuario.rol, opciones: OPCIONES_ROL, attrs: usuario.id === miId ? 'disabled title="No puede cambiar su propio rol"' : '' })}
        ${Campo({ name: 'contrasena', label: 'Nueva contraseña (opcional)', type: 'password', attrs: 'autocomplete="new-password"', help: 'Déjela vacía para conservar la actual.' })}
      `,
      onSubmit: async (form) => {
        const valores = leerFormulario(form);
        if (usuario.id === miId) valores.rol = usuario.rol;
        const errores = validar(valores, esquemaUsuarioEditar);
        if (!esValido(errores)) {
          mostrarErrores(form, errores);
          return false;
        }
        const payload = { nombre: valores.nombre, rol: valores.rol };
        if (valores.contrasena) payload.contrasena = valores.contrasena;
        try {
          await updateUsuario(usuario.id, payload);
          toast('Usuario actualizado.', 'ok');
          await cargar();
          return true;
        } catch (error) {
          mostrarErrorApi(form, error);
          return false;
        }
      },
    });
  }

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const valores = leerFormulario(form);
    valores.usuario = valores.usuario.toLowerCase();
    const errores = validar(valores, esquemaUsuarioNuevo);
    if (!esValido(errores)) {
      mostrarErrores(form, errores);
      return;
    }
    try {
      await createUsuario(valores);
      toast(`Usuario ${valores.usuario} creado.`, 'ok');
      await cargar();
    } catch (error) {
      mostrarErrorApi(form, error);
    }
  });

  root.addEventListener('click', async (event) => {
    const botonEditar = event.target.closest('[data-editar]');
    const botonEstado = event.target.closest('[data-estado]');
    if (botonEditar) {
      editar(usuarios.find((u) => u.id === Number(botonEditar.dataset.editar)));
    } else if (botonEstado) {
      const usuario = usuarios.find((u) => u.id === Number(botonEstado.dataset.estado));
      const activar = botonEstado.dataset.activo === 'true';
      const ok = await confirmar(
        `${activar ? 'Activar' : 'Desactivar'} usuario`,
        activar
          ? `<b>${escapeHtml(usuario.usuario)}</b> podrá volver a iniciar sesión.`
          : `<b>${escapeHtml(usuario.usuario)}</b> no podrá iniciar sesión y su sesión abierta se cerrará.`,
        activar ? 'Activar' : 'Desactivar',
        !activar,
      );
      if (!ok) return;
      try {
        toast((await setUsuarioActivo(usuario.id, activar)).message, 'ok');
        await cargar();
      } catch (error) {
        showApiError(error);
      }
    }
  });

  cargar();
}
