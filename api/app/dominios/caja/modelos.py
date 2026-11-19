from app import db


class CierreCaja(db.Model):
    """Cierre de caja de un dia: foto de los totales de pedidos al momento de cerrar."""

    __tablename__ = "cierres_caja"

    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, unique=True, nullable=False)  # un cierre por dia
    pedidos_entregados = db.Column(db.Integer, nullable=False, default=0)
    total_entregados = db.Column(db.Integer, nullable=False, default=0)
    pedidos_cancelados = db.Column(db.Integer, nullable=False, default=0)
    total_cancelados = db.Column(db.Integer, nullable=False, default=0)
    total_ventas = db.Column(db.Integer, nullable=False, default=0)
    observacion = db.Column(db.String(255), nullable=False, default="")
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    usuario_nombre = db.Column(db.String(100), nullable=False)
    fecha_cierre = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "fecha": self.fecha.isoformat(),
            "pedidos_entregados": self.pedidos_entregados,
            "total_entregados": self.total_entregados,
            "pedidos_cancelados": self.pedidos_cancelados,
            "total_cancelados": self.total_cancelados,
            "total_ventas": self.total_ventas,
            "observacion": self.observacion,
            "usuario": self.usuario_nombre,
            "fecha_cierre": self.fecha_cierre.isoformat(),
        }
