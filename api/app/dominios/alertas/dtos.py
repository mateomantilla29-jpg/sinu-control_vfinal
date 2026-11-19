from marshmallow import Schema, fields, validate

ESTADOS_FILTRO = ["activa", "atendida", "todas"]


class AlertaFiltroDTO(Schema):
    """?estado=activa|atendida|todas (por defecto activa)."""

    estado = fields.String(
        load_default="activa",
        validate=validate.OneOf(ESTADOS_FILTRO, error="Estado no válido. Use activa, atendida o todas."),
    )
