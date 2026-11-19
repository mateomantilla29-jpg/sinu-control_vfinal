from app.dominios.caja.modelos import CierreCaja
from app.dominios.caja.repositorios import CajaRepositorio
from app.dominios.pedidos.repositorios import PedidoRepositorio
from app.errores import ConflictoError
from app.utilidades import ahora, hoy

ABIERTOS = ("pendiente", "en preparación", "listo")


class CajaServicio:
    """Cierre de caja diario. Las ventas son las mismas que muestra el tablero:
    pedidos del dia no cancelados (cada pedido confirmado es una venta)."""

    def resumen(self, fecha=None):
        dia = fecha or hoy()
        pedidos = PedidoRepositorio.del_dia(dia)

        def grupo(estados):
            lista = [p for p in pedidos if p.estado in estados]
            return {"cantidad": len(lista), "total": sum(p.total for p in lista)}

        entregados = grupo(("entregado",))
        cancelados = grupo(("cancelado",))
        abiertos = grupo(ABIERTOS)
        cierre = CajaRepositorio.obtener_por_fecha(dia)
        return {
            "fecha": dia.isoformat(),
            "entregados": entregados,
            "cancelados": cancelados,
            "abiertos": abiertos,
            # Igual a ventas_hoy del tablero: entregados + abiertos (no cancelados)
            "ventas": {
                "cantidad": entregados["cantidad"] + abiertos["cantidad"],
                "total": entregados["total"] + abiertos["total"],
            },
            "puede_cerrar": cierre is None and abiertos["cantidad"] == 0,
            "cierre": cierre.to_dict() if cierre else None,
        }

    def cerrar(self, datos, usuario):
        dia = datos.get("fecha") or hoy()
        if CajaRepositorio.obtener_por_fecha(dia):
            raise ConflictoError(f"La caja del {dia.isoformat()} ya fue cerrada.")
        r = self.resumen(dia)
        if r["abiertos"]["cantidad"]:
            raise ConflictoError(
                f"Hay {r['abiertos']['cantidad']} pedido(s) sin entregar. "
                "Entréguelos o cancélelos antes de cerrar la caja."
            )
        cierre = CierreCaja(
            fecha=dia,
            pedidos_entregados=r["entregados"]["cantidad"],
            total_entregados=r["entregados"]["total"],
            pedidos_cancelados=r["cancelados"]["cantidad"],
            total_cancelados=r["cancelados"]["total"],
            total_ventas=r["ventas"]["total"],
            observacion=(datos.get("observacion") or "").strip(),
            usuario_id=usuario.id,
            usuario_nombre=usuario.nombre,
            fecha_cierre=ahora(),
        )
        return CajaRepositorio.guardar(cierre).to_dict()

    def historial(self):
        return [c.to_dict() for c in CajaRepositorio.listar()]
