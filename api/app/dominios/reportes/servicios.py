from app.dominios.inventario.modelos import TIPOS_MOVIMIENTO
from app.dominios.inventario.repositorios import clave_orden
from app.dominios.reportes.repositorios import ReporteRepositorio
from app.utilidades import r3


def _periodo(desde, hasta):
    return {"desde": desde.isoformat(), "hasta": hasta.isoformat()}


class ReporteServicio:
    """Reportes del Administrador con datos reales de pedidos y movimientos."""

    def mas_vendidos(self, desde, hasta):
        filas = [
            {"plato": nombre, "unidades": int(unidades), "ingresos": int(ingresos), "pedidos": int(pedidos)}
            for nombre, unidades, ingresos, pedidos in ReporteRepositorio.ventas_por_plato(desde, hasta)
        ]
        return {
            "periodo": _periodo(desde, hasta),
            "filas": filas,
            "totales": {
                "unidades": sum(f["unidades"] for f in filas),
                "ingresos": sum(f["ingresos"] for f in filas),
            },
        }

    def consumo_por_insumo(self, desde, hasta):
        """Ingresado, consumido neto (consumo - devoluciones) y mermado por insumo."""
        insumos = ReporteRepositorio.insumos_por_id()
        acumulado = {}
        for insumo_id, tipo, suma in ReporteRepositorio.movimientos_por_insumo(desde, hasta):
            fila = acumulado.setdefault(
                insumo_id, {"ingresado": 0.0, "consumido": 0.0, "mermado": 0.0}
            )
            suma = float(suma or 0)
            if tipo == "ingreso":
                fila["ingresado"] += suma
            elif tipo in ("consumo", "ajuste"):
                # consumo es negativo y la devolucion por cancelacion (ajuste) positiva
                fila["consumido"] -= suma
            elif tipo == "merma":
                fila["mermado"] -= suma

        filas = []
        for insumo_id, valores in acumulado.items():
            insumo = insumos.get(insumo_id)
            filas.append(
                {
                    "insumo_id": insumo_id,
                    "insumo": insumo.nombre if insumo else f"Insumo eliminado (#{insumo_id})",
                    "unidad": insumo.unidad if insumo else "",
                    **{k: r3(v) for k, v in valores.items()},
                }
            )
        filas.sort(key=lambda f: (-f["consumido"], clave_orden(f["insumo"])))
        return {"periodo": _periodo(desde, hasta), "filas": filas}

    def movimientos(self, desde, hasta, tipo=None):
        insumos = ReporteRepositorio.insumos_por_id()
        filas = []
        for m in ReporteRepositorio.movimientos(desde, hasta, tipo):
            insumo = insumos.get(m.insumo_id)
            filas.append(
                {
                    **m.to_dict(),
                    "tipo_nombre": TIPOS_MOVIMIENTO.get(m.tipo, m.tipo),
                    "insumo": insumo.nombre if insumo else f"Insumo eliminado (#{m.insumo_id})",
                    "unidad": insumo.unidad if insumo else "",
                    "lote": f"L-{m.lote_id}" if m.lote_id else None,
                }
            )
        conteo = {t: sum(1 for f in filas if f["tipo"] == t) for t in TIPOS_MOVIMIENTO}
        return {"periodo": _periodo(desde, hasta), "filas": filas, "totales": {"movimientos": len(filas), **conteo}}
