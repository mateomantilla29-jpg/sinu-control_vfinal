"""B5 · Cierre de caja: coincide con las ventas del tablero."""

from datetime import date, timedelta

from tests.conftest import API, crear_pedido


def _entregar(client, admin, pedido_id):
    for _ in range(3):
        assert client.patch(f"{API}/pedidos/{pedido_id}/avanzar", headers=admin).status_code == 200


def test_resumen_coincide_con_tablero(client, admin, mesero):
    p1 = crear_pedido(client, mesero, "Calamares apanados", 2, mesa="1")  # 60.000
    crear_pedido(client, mesero, "Ceviche de camarón", 1, mesa="2")  # 32.000 (abierto)
    p3 = crear_pedido(client, mesero, "Ceviche de camarón", 1, mesa="5")
    client.patch(f"{API}/pedidos/{p3['id']}/cancelar", headers=mesero)
    _entregar(client, admin, p1["id"])

    caja = client.get(f"{API}/caja/resumen", headers=admin).get_json()["data"]
    tablero = client.get(f"{API}/tablero/resumen", headers=admin).get_json()["data"]
    assert caja["ventas"] == tablero["ventas_hoy"] == {"total": 92000, "cantidad": 2}
    assert caja["entregados"] == {"cantidad": 1, "total": 60000}
    assert caja["cancelados"] == {"cantidad": 1, "total": 32000}
    assert caja["abiertos"]["cantidad"] == 1
    assert caja["puede_cerrar"] is False


def test_no_cierra_con_pedidos_abiertos_y_luego_si(client, admin, mesero):
    pedido = crear_pedido(client, mesero, "Calamares apanados", 1)
    assert client.post(f"{API}/caja/cierres", headers=admin, json={}).status_code == 409

    _entregar(client, admin, pedido["id"])
    resp = client.post(f"{API}/caja/cierres", headers=admin, json={"observacion": "Sin novedades"})
    assert resp.status_code == 201
    cierre = resp.get_json()["data"]
    tablero = client.get(f"{API}/tablero/resumen", headers=admin).get_json()["data"]
    assert cierre["total_ventas"] == tablero["ventas_hoy"]["total"] == 30000

    assert client.post(f"{API}/caja/cierres", headers=admin, json={}).status_code == 409
    historial = client.get(f"{API}/caja/cierres", headers=admin).get_json()["data"]
    assert len(historial) == 1 and historial[0]["observacion"] == "Sin novedades"


def test_caja_valida_fecha_y_observacion(client, admin):
    manana = (date.today() + timedelta(days=1)).isoformat()
    assert client.get(f"{API}/caja/resumen?fecha={manana}", headers=admin).status_code == 400
    assert client.post(f"{API}/caja/cierres", headers=admin, json={"fecha": manana}).status_code == 400
    assert client.post(f"{API}/caja/cierres", headers=admin, json={"observacion": "x" * 300}).status_code == 400


def test_mesero_no_cierra_caja(client, mesero):
    assert client.get(f"{API}/caja/resumen", headers=mesero).status_code == 403
    assert client.post(f"{API}/caja/cierres", headers=mesero, json={}).status_code == 403
