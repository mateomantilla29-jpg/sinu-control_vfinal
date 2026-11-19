from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.dominios.usuarios.modelos import ROLES

# Usuario de acceso: minusculas, numeros, punto, guion y guion bajo
PATRON_USUARIO = r"^[a-z0-9._-]{3,50}$"
MSG_USUARIO = "Use de 3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo."
MIN_CLAVE = 6
MSG_CLAVE = f"La contraseña debe tener al menos {MIN_CLAVE} caracteres."


def _clave(requerida=True):
    return fields.String(
        required=requerida,
        validate=validate.Length(min=MIN_CLAVE, max=128, error=MSG_CLAVE),
    )


def _nombre():
    return fields.String(
        required=True,
        validate=validate.Length(min=2, max=100, error="El nombre debe tener entre 2 y 100 caracteres."),
    )


def _rol():
    return fields.String(
        required=True,
        validate=validate.OneOf(list(ROLES), error="Rol no válido. Use admin o mesero."),
    )


class LoginDTO(Schema):
    """DTO para validar el inicio de sesion."""

    usuario = fields.String(required=True, validate=validate.Length(min=1, max=50))
    contrasena = fields.String(required=True, validate=validate.Length(min=1))


class UsuarioCrearDTO(Schema):
    """Alta de usuario por el Administrador."""

    usuario = fields.String(required=True, validate=validate.Regexp(PATRON_USUARIO, error=MSG_USUARIO))
    nombre = _nombre()
    rol = _rol()
    contrasena = _clave()


class UsuarioEditarDTO(Schema):
    """Edicion por el Administrador. La contrasena es opcional (restablecer)."""

    nombre = _nombre()
    rol = _rol()
    contrasena = _clave(requerida=False)


class UsuarioEstadoDTO(Schema):
    activo = fields.Boolean(required=True)


class PerfilDTO(Schema):
    """El propio usuario solo puede cambiar su nombre visible."""

    nombre = _nombre()


class CambioContrasenaDTO(Schema):
    actual = fields.String(required=True, validate=validate.Length(min=1, error="Escriba su contraseña actual."))
    nueva = _clave()
    confirmacion = fields.String(required=True)

    @validates_schema
    def coherencia(self, datos, **kwargs):
        if datos["nueva"] != datos["confirmacion"]:
            raise ValidationError("La confirmación no coincide con la nueva contraseña.", "confirmacion")
        if datos["nueva"] == datos["actual"]:
            raise ValidationError("La nueva contraseña debe ser distinta de la actual.", "nueva")
