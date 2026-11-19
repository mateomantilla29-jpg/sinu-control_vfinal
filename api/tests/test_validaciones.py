"""C4 · Todo POST/PUT/PATCH con cuerpo invalido responde 400 con detalle por campo."""

import pytest

from tests.conftest import API

CASOS = [
    ("post", "/insumos", {"nombre": "", "unidad": "taza", "stock_minimo": -1}, {"nombre", "unidad", "stock_minimo"}),
    ("put", "/insumos/1", {"nombre": "Arroz", "unidad": "kg"}, {"stock_minimo"}),
    ("post", "/lotes", {"insumo_id": 1, "cantidad": 0, "fecha_ingreso": "2026-01-10", "fecha_vencimiento": "x"},
     {"cantidad", "fecha_vencimiento"}),
    ("post", "/lotes", {"insumo_id": 1, "cantidad": 2, "fecha_ingreso": "2026-01-10", "fecha_vencimiento": "2026-01-01"},
     {"fecha_vencimiento"}),
    ("post", "/platos", {"nombre": "Prueba", "precio": 0, "receta": []}, {"precio", "receta"}),
    ("post", "/platos", {"nombre": "Prueba", "precio": 100, "receta": [{"insumo_id": 1, "cantidad": 1}, {"insumo_id": 1, "cantidad": 2}]},
     {"receta"}),
    ("post", "/pedidos", {"mesa": "10", "items": []}, {"mesa", "items"}),
    ("post", "/pedidos/validar", {"items": [{"plato_id": 1, "cantidad": 0}]}, {"items"}),
    ("post", "/usuarios", {"usuario": "x", "nombre": "A", "rol": "chef", "contrasena": "1"},
     {"usuario", "nombre", "rol", "contrasena"}),
    ("post", "/lotes/1/merma", {"cantidad": -1}, {"cantidad", "motivo"}),
    ("post", "/caja/cierres", {"fecha": "no-es-fecha"}, {"fecha"}),
    ("post", "/insumos", {"nombre": "Pargo", "unidad": "kg", "stock_minimo": 1, "color": "rojo"}, {"color"}),
]


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo", "campos"), CASOS)
def test_cuerpo_invalido_devuelve_400_con_detalle(client, admin, metodo, ruta, cuerpo, campos):
    resp = getattr(client, metodo)(f"{API}{ruta}", headers=admin, json=cuerpo)
    assert resp.status_code == 400, resp.get_json()
    error = resp.get_json()["error"]
    assert error["message"] == "Datos de entrada inválidos."
    assert campos <= set(error["details"])


def test_cuerpo_que_no_es_objeto(client, admin):
    resp = client.post(f"{API}/insumos", headers=admin, json=[1, 2, 3])
    assert resp.status_code == 400


def test_query_de_alertas_validada(client, mesero):
    resp = client.get(f"{API}/alertas?estado=borradas", headers=mesero)
    assert resp.status_code == 400
    assert "estado" in resp.get_json()["error"]["details"]


def test_metodo_no_permitido_responde_json(client, admin):
    resp = client.delete(f"{API}/mesas", headers=admin)
    assert resp.status_code == 405
    assert resp.get_json()["success"] is False
