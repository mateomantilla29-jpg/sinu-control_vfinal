from flask import Blueprint

from app.dominios.usuarios.dtos import (
    CambioContrasenaDTO,
    LoginDTO,
    PerfilDTO,
    UsuarioCrearDTO,
    UsuarioEditarDTO,
    UsuarioEstadoDTO,
)
from app.respuestas import ok, validar
from app.seguridad import requiere_admin, requiere_token

usuarios_bp = Blueprint("usuarios", __name__)

# Variable global que el app factory asignara al crear la app
usuario_servicio = None


# ---------------- Sesion ----------------


@usuarios_bp.route("/login", methods=["POST"])
def login():
    """Iniciar sesion con usuario y contrasena; devuelve token JWT y rol."""
    datos = validar(LoginDTO())
    return ok(usuario_servicio.iniciar_sesion(datos), "Inicio de sesion exitoso.")


@usuarios_bp.route("/token/renovar", methods=["POST"])
@requiere_token
def renovar_token(usuario_id):
    """Entrega un token nuevo mientras el actual siga vigente (evita que la sesion caiga)."""
    return ok(usuario_servicio.renovar(usuario_id), "Sesión renovada.")


# ---------------- Mi perfil (cualquier rol) ----------------


@usuarios_bp.route("/yo", methods=["GET"])
@requiere_token
def usuario_actual(usuario_id):
    """Datos del usuario autenticado (para revalidar la sesion guardada)."""
    return ok(usuario_servicio.obtener_actual(usuario_id), "Usuario autenticado.")


@usuarios_bp.route("/yo", methods=["PUT"])
@requiere_token
def actualizar_perfil(usuario_id):
    datos = validar(PerfilDTO())
    return ok(usuario_servicio.actualizar_perfil(usuario_id, datos), "Perfil actualizado.")


@usuarios_bp.route("/yo/contrasena", methods=["PATCH"])
@requiere_token
def cambiar_contrasena(usuario_id):
    usuario_servicio.cambiar_contrasena(usuario_id, validar(CambioContrasenaDTO()))
    return ok(None, "Contraseña actualizada.")


# ---------------- Gestion de usuarios (solo Administrador) ----------------


@usuarios_bp.route("", methods=["GET"])
@requiere_admin
def listar_usuarios(usuario_id):
    return ok(usuario_servicio.listar(), "Usuarios.")


@usuarios_bp.route("", methods=["POST"])
@requiere_admin
def crear_usuario(usuario_id):
    return ok(usuario_servicio.crear(validar(UsuarioCrearDTO())), "Usuario creado.", 201)


@usuarios_bp.route("/<int:objetivo_id>", methods=["PUT"])
@requiere_admin
def editar_usuario(usuario_id, objetivo_id):
    datos = validar(UsuarioEditarDTO())
    return ok(usuario_servicio.editar(objetivo_id, datos, usuario_id), "Usuario actualizado.")


@usuarios_bp.route("/<int:objetivo_id>/estado", methods=["PATCH"])
@requiere_admin
def cambiar_estado_usuario(usuario_id, objetivo_id):
    activo = validar(UsuarioEstadoDTO())["activo"]
    usuario = usuario_servicio.cambiar_estado(objetivo_id, activo, usuario_id)
    return ok(usuario, "Usuario activado." if activo else "Usuario desactivado.")
