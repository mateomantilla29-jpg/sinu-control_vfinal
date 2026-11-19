from app import db
from app.dominios.caja.modelos import CierreCaja


class CajaRepositorio:
    """Capa de acceso a datos para los cierres de caja."""

    @staticmethod
    def obtener_por_fecha(fecha):
        return db.session.query(CierreCaja).filter_by(fecha=fecha).first()

    @staticmethod
    def listar(limite=30):
        return db.session.query(CierreCaja).order_by(CierreCaja.fecha.desc()).limit(limite).all()

    @staticmethod
    def guardar(cierre):
        db.session.add(cierre)
        db.session.commit()
        return cierre
