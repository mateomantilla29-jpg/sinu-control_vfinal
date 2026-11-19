from datetime import UTC, datetime, timedelta

import jwt
from werkzeug.security import check_password_hash, generate_password_hash

from app.dominios.usuarios.modelos import Usuario
from app.dominios.usuarios.repositorios import UsuarioRepositorio
from app.errores import (
    ConflictoError,
    CredencialesInvalidasError,
    DatosInvalidosError,
    NoEncontradoError,
)


def _generar_access_token(usuario, secret_key, exp_minutes):
    """Genera un JWT de acceso con claims basicos (el rol se consulta en BD)."""
    ahora = datetime.now(UTC)
    payload = {
        "sub": str(usuario.id),
        "rol": usuario.rol,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=exp_minutes),
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")


class UsuarioServicio:
    """Login, sesion, perfil y gestion de usuarios."""

    def __init__(self, secret_key, jwt_exp_minutes):
        self.secret_key = secret_key
        self.jwt_exp_minutes = jwt_exp_minutes

    # ---------------- Sesion ----------------

    def _sesion(self, usuario):
        return {
            "access_token": _generar_access_token(usuario, self.secret_key, self.jwt_exp_minutes),
            "expira_en_minutos": self.jwt_exp_minutes,
            "usuario": usuario.to_dict(),
        }

    def iniciar_sesion(self, datos):
        """Valida usuario/contrasena y genera un JWT de acceso."""
        usuario = UsuarioRepositorio.obtener_por_usuario(datos["usuario"].strip().lower())
        if not usuario or not check_password_hash(usuario.contrasena, datos["contrasena"]):
            raise CredencialesInvalidasError("Usuario o contraseña incorrectos.")
        if not usuario.activo:
            raise CredencialesInvalidasError("Usuario desactivado. Consulte al administrador.")
        return self._sesion(usuario)

    def renovar(self, usuario_id):
        """Emite un token nuevo a partir de uno aun valido (renovacion de sesion)."""
        return self._sesion(self.obtener(usuario_id))

    def obtener(self, usuario_id):
        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)
        if not usuario:
            raise NoEncontradoError("Usuario no encontrado.")
        return usuario

    def obtener_actual(self, usuario_id):
        return self.obtener(usuario_id).to_dict()

    # ---------------- Mi perfil ----------------

    def actualizar_perfil(self, usuario_id, datos):
        usuario = self.obtener(usuario_id)
        usuario.nombre = datos["nombre"].strip()
        return UsuarioRepositorio.guardar(usuario).to_dict()

    def cambiar_contrasena(self, usuario_id, datos):
        usuario = self.obtener(usuario_id)
        if not check_password_hash(usuario.contrasena, datos["actual"]):
            raise DatosInvalidosError({"actual": ["La contraseña actual no es correcta."]})
        usuario.contrasena = generate_password_hash(datos["nueva"])
        UsuarioRepositorio.guardar(usuario)

    # ---------------- Gestion (solo Administrador) ----------------

    def listar(self):
        return [u.to_dict() for u in UsuarioRepositorio.listar()]

    def crear(self, datos):
        nombre_usuario = datos["usuario"].strip().lower()
        if UsuarioRepositorio.obtener_por_usuario(nombre_usuario):
            raise ConflictoError("Ya existe un usuario con ese nombre de acceso.")
        usuario = Usuario(
            usuario=nombre_usuario,
            nombre=datos["nombre"].strip(),
            rol=datos["rol"],
            contrasena=generate_password_hash(datos["contrasena"]),
            activo=True,
        )
        return UsuarioRepositorio.guardar(usuario).to_dict()

    def _proteger_ultimo_admin(self, usuario):
        """Siempre debe quedar al menos un Administrador activo."""
        if usuario.rol == "admin" and usuario.activo and UsuarioRepositorio.contar_admins_activos() <= 1:
            raise ConflictoError("Debe quedar al menos un Administrador activo.")

    def editar(self, usuario_id, datos, editor_id):
        usuario = self.obtener(usuario_id)
        if usuario.id == editor_id and datos["rol"] != usuario.rol:
            raise ConflictoError("No puede cambiar su propio rol.")
        if datos["rol"] != usuario.rol:
            self._proteger_ultimo_admin(usuario)
        usuario.nombre = datos["nombre"].strip()
        usuario.rol = datos["rol"]
        if datos.get("contrasena"):
            usuario.contrasena = generate_password_hash(datos["contrasena"])
        return UsuarioRepositorio.guardar(usuario).to_dict()

    def cambiar_estado(self, usuario_id, activo, editor_id):
        """Activa o desactiva. Nadie puede desactivarse a si mismo."""
        usuario = self.obtener(usuario_id)
        if usuario.id == editor_id and not activo:
            raise ConflictoError("No puede desactivar su propio usuario.")
        if not activo:
            self._proteger_ultimo_admin(usuario)
        usuario.activo = activo
        return UsuarioRepositorio.guardar(usuario).to_dict()
