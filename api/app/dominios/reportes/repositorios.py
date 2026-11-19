from datetime import datetime, time

from app import db
from app.dominios.inventario.modelos import Insumo, Movimiento
from app.dominios.pedidos.modelos import Pedido, PedidoItem


def _limites(desde, hasta):
    return datetime.combine(desde, time.min), datetime.combine(hasta, time.max)


class ReporteRepositorio:
    """Consultas de solo lectura agregadas en la base de datos (GROUP BY)."""

    @staticmethod
    def ventas_por_plato(desde, hasta):
        """[(nombre, unidades, ingresos, pedidos)] de pedidos no cancelados en el rango."""
        inicio, fin = _limites(desde, hasta)
        unidades = db.func.sum(PedidoItem.cantidad)
        return (
            db.session.query(
                PedidoItem.nombre,
                unidades,
                db.func.sum(PedidoItem.cantidad * PedidoItem.precio),
                db.func.count(db.distinct(PedidoItem.pedido_id)),
            )
            .join(Pedido, Pedido.id == PedidoItem.pedido_id)
            .filter(Pedido.estado != "cancelado", Pedido.fecha >= inicio, Pedido.fecha <= fin)
            .group_by(PedidoItem.nombre)
            .order_by(unidades.desc(), PedidoItem.nombre)
            .all()
        )

    @staticmethod
    def movimientos_por_insumo(desde, hasta):
        """[(insumo_id, tipo, suma_cantidad)] agrupado por insumo y tipo."""
        inicio, fin = _limites(desde, hasta)
        return (
            db.session.query(Movimiento.insumo_id, Movimiento.tipo, db.func.sum(Movimiento.cantidad))
            .filter(Movimiento.fecha >= inicio, Movimiento.fecha <= fin)
            .group_by(Movimiento.insumo_id, Movimiento.tipo)
            .all()
        )

    @staticmethod
    def movimientos(desde, hasta, tipo=None):
        inicio, fin = _limites(desde, hasta)
        consulta = db.session.query(Movimiento).filter(
            Movimiento.fecha >= inicio, Movimiento.fecha <= fin
        )
        if tipo:
            consulta = consulta.filter(Movimiento.tipo == tipo)
        return consulta.order_by(Movimiento.fecha.desc(), Movimiento.id.desc()).all()

    @staticmethod
    def insumos_por_id():
        return {i.id: i for i in db.session.query(Insumo).all()}
