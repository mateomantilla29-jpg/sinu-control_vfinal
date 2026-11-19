from app import db
from app.dominios.usuarios.modelos import Usuario


class UsuarioRepositorio:
    """Capa de acceso a datos para usuarios."""

    @staticmethod
    def guardar(usuario):
        db.session.add(usuario)
        db.session.commit()
        return usuario

    @staticmethod
    def obtener_por_usuario(nombre_usuario):
        return db.session.query(Usuario).filter_by(usuario=nombre_usuario).first()

    @staticmethod
    def obtener_por_id(usuario_id):
        return db.session.get(Usuario, usuario_id)

    @staticmethod
    def listar():
        return db.session.query(Usuario).order_by(Usuario.activo.desc(), Usuario.usuario).all()

    @staticmethod
    def contar_admins_activos():
        return db.session.query(Usuario).filter_by(rol="admin", activo=True).count()
