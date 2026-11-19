from app import db
from app.dominios.inventario.modelos import Insumo, Lote, Movimiento
from app.dominios.inventario.repositorios import InventarioRepositorio
from app.errores import ConflictoError, NoEncontradoError
from app.utilidades import ahora, dias_hasta, fmt_num, r3

EPS = 1e-9


def orden_fefo(lote):
    """FEFO: primero vence, primero sale; a igual vencimiento, el que ingreso antes."""
    return (lote.fecha_vencimiento, lote.fecha_ingreso, lote.id)


class InventarioServicio:
    """Logica de inventario por lotes con rotacion FEFO (portada de SINU)."""

    def __init__(self, dias_alerta_defecto=3):
        self.dias_alerta_defecto = dias_alerta_defecto

    # ---------------- Insumos ----------------

    def obtener_insumo(self, insumo_id):
        insumo = InventarioRepositorio.obtener_insumo(insumo_id)
        if not insumo:
            raise NoEncontradoError(f"Insumo con id {insumo_id} no encontrado.")
        return insumo

    def listar_insumos(self):
        return InventarioRepositorio.listar_insumos()

    def guardar_insumo(self, datos, insumo_id=None):
        """Crea (insumo_id=None) o actualiza un insumo; el nombre es unico."""
        nombre = datos["nombre"].strip()
        duplicado = InventarioRepositorio.obtener_insumo_por_nombre(nombre)
        if duplicado and duplicado.id != insumo_id:
            raise ConflictoError("Ya existe un insumo con ese nombre.")

        insumo = self.obtener_insumo(insumo_id) if insumo_id else Insumo()
        insumo.nombre = nombre
        insumo.unidad = datos["unidad"]
        insumo.stock_minimo = r3(datos["stock_minimo"])
        insumo.dias_alerta = datos.get("dias_alerta")
        return InventarioRepositorio.guardar(insumo)

    def eliminar_insumo(self, insumo_id):
        from app.dominios.platos.modelos import RecetaItem

        insumo = self.obtener_insumo(insumo_id)
        if any(lote.cantidad_actual > 0 and not lote.mermado for lote in insumo.lotes):
            raise ConflictoError("No se puede eliminar: el insumo tiene lotes con existencias.")
        if db.session.query(RecetaItem).filter_by(insumo_id=insumo_id).first():
            raise ConflictoError("No se puede eliminar: el insumo está en una receta.")
        InventarioRepositorio.eliminar(insumo)

    def dias_alerta(self, insumo):
        return insumo.dias_alerta if insumo.dias_alerta is not None else self.dias_alerta_defecto

    # ---------------- Lotes y stock ----------------

    def lotes_de(self, insumo):
        return sorted(insumo.lotes, key=orden_fefo)

    def lotes_utilizables(self, insumo):
        """Lotes con existencias y sin vencer, en orden FEFO."""
        return [lote for lote in self.lotes_de(insumo) if lote.estado == "activo"]

    def stock_disponible(self, insumo):
        """Stock que se puede usar (excluye lotes vencidos y dados de baja)."""
        return r3(sum(lote.cantidad_actual for lote in self.lotes_utilizables(insumo)))

    def stock_vencido(self, insumo):
        return r3(sum(lote.cantidad_actual for lote in insumo.lotes if lote.estado == "vencido"))

    def proximo_a_vencer(self, insumo):
        limite = self.dias_alerta(insumo)
        return any(
            dias_hasta(lote.fecha_vencimiento) <= limite for lote in self.lotes_utilizables(insumo)
        )

    def listar_lotes(self, solo_con_stock=True):
        lotes = InventarioRepositorio.listar_lotes()
        if solo_con_stock:
            lotes = [lote for lote in lotes if lote.cantidad_actual > 0 and not lote.mermado]
        return sorted(lotes, key=orden_fefo)

    def ingresar_lote(self, datos, usuario="Sistema"):
        insumo = self.obtener_insumo(datos["insumo_id"])
        cantidad = r3(datos["cantidad"])
        lote = Lote(
            insumo_id=insumo.id,
            cantidad_inicial=cantidad,
            cantidad_actual=cantidad,
            fecha_ingreso=datos["fecha_ingreso"],
            fecha_vencimiento=datos["fecha_vencimiento"],
        )
        db.session.add(lote)
        db.session.flush()  # asigna lote.id para el movimiento
        self._movimiento("ingreso", insumo.id, lote.id, cantidad, "Ingreso de lote", usuario)
        db.session.commit()
        return lote

    def consumir_fefo(self, insumo, cantidad, nota, usuario="Sistema"):
        """Descuenta del lote que vence primero y sigue con el siguiente.

        Nunca deja stock negativo. NO hace commit: el pedido que lo invoca
        confirma o revierte toda la transaccion. Devuelve [(lote, cantidad)].
        """
        requerido = r3(cantidad)
        if requerido > self.stock_disponible(insumo) + EPS:
            raise ConflictoError(f"Stock insuficiente de {insumo.nombre}.")

        falta, consumos = requerido, []
        for lote in self.lotes_utilizables(insumo):
            if falta <= 0:
                break
            toma = r3(min(lote.cantidad_actual, falta))
            lote.cantidad_actual = r3(lote.cantidad_actual - toma)
            falta = r3(falta - toma)
            consumos.append((lote, toma))
            self._movimiento("consumo", insumo.id, lote.id, -toma, nota, usuario)
        return consumos

    def devolver(self, consumos, nota, usuario="Sistema"):
        """Devuelve cantidades a sus lotes originales (pedido cancelado). Sin commit."""
        for consumo in consumos:
            lote = InventarioRepositorio.obtener_lote(consumo.lote_id)
            if not lote:
                continue
            lote.cantidad_actual = r3(lote.cantidad_actual + consumo.cantidad)
            self._movimiento("ajuste", consumo.insumo_id, lote.id, consumo.cantidad, nota, usuario)

    # ---------------- Mermas y bajas ----------------

    def obtener_lote(self, lote_id):
        lote = InventarioRepositorio.obtener_lote(lote_id)
        if not lote:
            raise NoEncontradoError(f"Lote con id {lote_id} no encontrado.")
        return lote

    def registrar_merma(self, lote_id, datos, usuario="Sistema"):
        """Descuenta una cantidad de un lote con existencias y deja el movimiento 'merma'."""
        lote = self.obtener_lote(lote_id)
        if lote.mermado or lote.cantidad_actual <= 0:
            raise ConflictoError(f"El lote {lote.codigo} no tiene existencias.")
        cantidad = r3(datos["cantidad"])
        if cantidad > lote.cantidad_actual + EPS:
            raise ConflictoError(
                f"La merma ({fmt_num(cantidad)}) supera lo que queda en el lote {lote.codigo} "
                f"({fmt_num(lote.cantidad_actual)} {lote.insumo.unidad})."
            )
        lote.cantidad_actual = r3(lote.cantidad_actual - cantidad)
        nota = f"Merma {lote.codigo}: {datos['motivo'].strip()}"
        self._movimiento("merma", lote.insumo_id, lote.id, -cantidad, nota, usuario)
        db.session.commit()
        return lote

    def _baja(self, lote, usuario):
        cantidad = lote.cantidad_actual
        lote.cantidad_actual = 0
        lote.mermado = True
        nota = f"Baja de lote vencido {lote.codigo}"
        self._movimiento("merma", lote.insumo_id, lote.id, -cantidad, nota, usuario)
        return cantidad

    def dar_de_baja(self, lote_id, usuario="Sistema"):
        """Da de baja TODO lo que queda de un lote vencido (sale del inventario)."""
        lote = self.obtener_lote(lote_id)
        if lote.estado != "vencido":
            raise ConflictoError(
                f"Solo se dan de baja lotes vencidos. El lote {lote.codigo} está {lote.estado}; "
                "para descontar parte de él registre una merma."
            )
        self._baja(lote, usuario)
        db.session.commit()
        return lote

    def dar_de_baja_vencidos(self, usuario="Sistema"):
        """Da de baja todos los lotes vencidos con existencias en una sola transaccion."""
        vencidos = [lote for lote in InventarioRepositorio.listar_lotes() if lote.estado == "vencido"]
        detalle = []
        for lote in sorted(vencidos, key=orden_fefo):
            cantidad = self._baja(lote, usuario)
            detalle.append(
                {"lote": lote.codigo, "insumo": lote.insumo.nombre, "cantidad": cantidad,
                 "unidad": lote.insumo.unidad}
            )
        db.session.commit()
        return {"lotes": len(detalle), "detalle": detalle}

    def resumen(self):
        """Existencias por insumo con estado ok / bajo / agotado."""
        filas = []
        for insumo in self.listar_insumos():
            disponible = self.stock_disponible(insumo)
            utilizables = self.lotes_utilizables(insumo)
            if disponible <= 0:
                estado = "agotado"
            elif disponible <= insumo.stock_minimo:
                estado = "bajo"
            else:
                estado = "ok"
            filas.append(
                {
                    "insumo": insumo.to_dict(),
                    "disponible": disponible,
                    "vencido": self.stock_vencido(insumo),
                    "lotes_activos": len(utilizables),
                    "proximo_vencimiento": (
                        utilizables[0].fecha_vencimiento.isoformat() if utilizables else None
                    ),
                    "usar_primero": self.proximo_a_vencer(insumo),
                    "estado": estado,
                }
            )
        return filas

    # ---------------- Interno ----------------

    @staticmethod
    def _movimiento(tipo, insumo_id, lote_id, cantidad, nota, usuario):
        InventarioRepositorio.agregar(
            Movimiento(
                tipo=tipo,
                insumo_id=insumo_id,
                lote_id=lote_id,
                cantidad=r3(cantidad),
                fecha=ahora(),
                usuario=usuario,
                nota=nota or "",
            )
        )
