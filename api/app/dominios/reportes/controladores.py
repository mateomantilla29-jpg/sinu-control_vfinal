from flask import Blueprint, request

from app.dominios.reportes.dtos import FiltroReporteDTO
from app.respuestas import ok, validar
from app.seguridad import requiere_admin

reportes_bp = Blueprint("reportes", __name__)

# Variable global que el app factory asignara al crear la app
reporte_servicio = None


def _filtro():
    """Valida ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD[&tipo=] (400 si es invalido)."""
    return validar(FiltroReporteDTO(), request.args.to_dict())


@reportes_bp.route("/mas-vendidos", methods=["GET"])
@requiere_admin
def mas_vendidos(usuario_id):
    f = _filtro()
    return ok(reporte_servicio.mas_vendidos(f["desde"], f["hasta"]), "Platos más vendidos.")


@reportes_bp.route("/consumo-insumos", methods=["GET"])
@requiere_admin
def consumo_insumos(usuario_id):
    f = _filtro()
    return ok(reporte_servicio.consumo_por_insumo(f["desde"], f["hasta"]), "Consumo por insumo.")


@reportes_bp.route("/movimientos", methods=["GET"])
@requiere_admin
def movimientos(usuario_id):
    f = _filtro()
    return ok(reporte_servicio.movimientos(f["desde"], f["hasta"], f["tipo"]), "Movimientos de inventario.")
