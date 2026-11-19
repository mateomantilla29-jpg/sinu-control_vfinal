from datetime import timedelta

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.dominios.inventario.modelos import TIPOS_MOVIMIENTO
from app.utilidades import hoy

DIAS_POR_DEFECTO = 7
MAX_DIAS = 366


class FiltroReporteDTO(Schema):
    """Filtro de fechas de los reportes (query string). Por defecto, los ultimos 7 dias."""

    desde = fields.Date(load_default=None)
    hasta = fields.Date(load_default=None)
    tipo = fields.String(
        load_default=None,
        validate=validate.OneOf(list(TIPOS_MOVIMIENTO), error="Tipo de movimiento no válido."),
    )

    @validates_schema
    def rango(self, datos, **kwargs):
        hasta = datos.get("hasta") or hoy()
        desde = datos.get("desde") or hasta - timedelta(days=DIAS_POR_DEFECTO - 1)
        if desde > hasta:
            raise ValidationError("La fecha inicial no puede ser posterior a la final.", "desde")
        if (hasta - desde).days >= MAX_DIAS:
            raise ValidationError(f"El rango máximo es de {MAX_DIAS} días.", "hasta")
        datos["desde"], datos["hasta"] = desde, hasta
