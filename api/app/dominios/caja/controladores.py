from flask import Blueprint, request

from app.dominios.caja.dtos import CierreCajaDTO, FechaCajaDTO
from app.dominios.usuarios.repositorios import UsuarioRepositorio
from app.respuestas import ok, validar
from app.seguridad import requiere_admin

caja_bp = Blueprint("caja", __name__)

# Variable global que el app factory asignara al crear la app
caja_servicio = None


@caja_bp.route("/resumen", methods=["GET"])
@requiere_admin
def resumen(usuario_id):
    """Totales del dia (?fecha=AAAA-MM-DD, por defecto hoy) antes de cerrar."""
    fecha = validar(FechaCajaDTO(), request.args.to_dict())["fecha"]
    return ok(caja_servicio.resumen(fecha), "Resumen de caja.")


@caja_bp.route("/cierres", methods=["POST"])
@requiere_admin
def cerrar(usuario_id):
    cierre = caja_servicio.cerrar(validar(CierreCajaDTO()), UsuarioRepositorio.obtener_por_id(usuario_id))
    return ok(cierre, f"Caja del {cierre['fecha']} cerrada.", 201)


@caja_bp.route("/cierres", methods=["GET"])
@requiere_admin
def historial(usuario_id):
    return ok(caja_servicio.historial(), "Cierres de caja.")
