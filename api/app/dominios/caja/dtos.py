from marshmallow import Schema, ValidationError, fields, validate, validates

from app.utilidades import hoy


class FechaCajaDTO(Schema):
    """?fecha=AAAA-MM-DD (por defecto hoy). No se aceptan fechas futuras."""

    fecha = fields.Date(load_default=None)

    @validates("fecha")
    def no_futura(self, fecha, **kwargs):
        if fecha and fecha > hoy():
            raise ValidationError("No se puede consultar ni cerrar una fecha futura.")


class CierreCajaDTO(FechaCajaDTO):
    observacion = fields.String(
        load_default="",
        validate=validate.Length(max=255, error="La observación admite hasta 255 caracteres."),
    )
