from functools import wraps

import jwt
from flask import current_app, jsonify, request

from app.errores import PermisoDenegadoError


def _extraer_y_validar_token():
    """Extrae el header Authorization, valida el JWT y devuelve el usuario_id."""
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None, (
            jsonify({"success": False, "error": {"message": "Token no proporcionado."}}),
            401,
        )

    partes = auth_header.split()
    if len(partes) != 2 or partes[0].lower() != "bearer":
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": {"message": "Formato de token invalido. Use: Bearer <token>"},
                }
            ),
            401,
        )

    try:
        payload = jwt.decode(
            partes[1],
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
        return int(payload["sub"]), None
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"success": False, "error": {"message": "Token expirado."}}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"success": False, "error": {"message": "Token invalido."}}), 401)


def _usuario_activo(usuario_id):
    from app.dominios.usuarios.repositorios import UsuarioRepositorio

    usuario = UsuarioRepositorio.obtener_por_id(usuario_id)
    return usuario if usuario and usuario.activo else None


def _sesion_invalida():
    return (
        jsonify({"success": False, "error": {"message": "Usuario desactivado o inexistente."}}),
        401,
    )


def requiere_token(f):
    """Decorador que exige un token JWT valido de un usuario activo. Inyecta `usuario_id`."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        usuario_id, error = _extraer_y_validar_token()
        if error:
            return error
        if not _usuario_activo(usuario_id):
            return _sesion_invalida()
        return f(*args, usuario_id=usuario_id, **kwargs)

    return wrapper


def requiere_rol(*roles):
    """Exige token valido, usuario activo Y que el rol real (en BD) este en `roles`."""

    def decorador(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            usuario_id, error = _extraer_y_validar_token()
            if error:
                return error

            usuario = _usuario_activo(usuario_id)
            if not usuario:
                return _sesion_invalida()
            if usuario.rol not in roles:
                raise PermisoDenegadoError("Permiso denegado para su rol.")

            return f(*args, usuario_id=usuario_id, **kwargs)

        return wrapper

    return decorador


# Atajo equivalente al de la API de referencia
requiere_admin = requiere_rol("admin")
