"""B4 · Reportes con datos reales y filtro de fechas."""

from datetime import date, timedelta

from tests.conftest import API, crear_pedido


def test_mas_vendidos_excluye_cancelados(client, admin, mesero):
    crear_pedido(client, mesero, "Calamares apanados", 3, mesa="1")
    crear_pedido(client, mesero, "Ceviche de camarón", 1, mesa="2")
    cancelado = crear_pedido(client, mesero, "Ceviche de camarón", 2, mesa="4")
    client.patch(f"{API}/pedidos/{cancelado['id']}/cancelar", headers=mesero)

    datos = client.get(f"{API}/reportes/mas-vendidos", headers=admin).get_json()["data"]
    assert datos["filas"][0] == {"plato": "Calamares apanados", "unidades": 3, "ingresos": 90000, "pedidos": 1}
    assert datos["totales"] == {"unidades": 4, "ingresos": 122000}


def test_consumo_neto_descuenta_devoluciones(client, admin, mesero):
    pedido = crear_pedido(client, mesero, "Calamares apanados", 4)  # 1 kg de calamar
    crear_pedido(client, mesero, "Calamares apanados", 2, mesa="2")  # 0,5 kg
    client.patch(f"{API}/pedidos/{pedido['id']}/cancelar", headers=mesero)

    filas = client.get(f"{API}/reportes/consumo-insumos", headers=admin).get_json()["data"]["filas"]
    calamar = next(f for f in filas if f["insumo"] == "Calamar")
    assert calamar["consumido"] == 0.5
    assert calamar["ingresado"] > 0


def test_movimientos_filtra_por_tipo_y_fecha(client, admin, mesero):
    crear_pedido(client, mesero, "Calamares apanados", 1)
    datos = client.get(f"{API}/reportes/movimientos?tipo=consumo", headers=admin).get_json()["data"]
    assert datos["filas"] and all(m["tipo"] == "consumo" for m in datos["filas"])

    manana = (date.today() + timedelta(days=1)).isoformat()
    vacio = client.get(f"{API}/reportes/movimientos?desde={manana}&hasta={manana}", headers=admin).get_json()
    assert vacio["data"]["filas"] == []


def test_filtros_invalidos_devuelven_400(client, admin):
    assert client.get(f"{API}/reportes/mas-vendidos?desde=2026-12-01&hasta=2026-11-01", headers=admin).status_code == 400
    assert client.get(f"{API}/reportes/mas-vendidos?desde=ayer", headers=admin).status_code == 400
    assert client.get(f"{API}/reportes/movimientos?tipo=robo", headers=admin).status_code == 400
    assert client.get(f"{API}/reportes/consumo-insumos?desde=2020-01-01&hasta=2026-01-01", headers=admin).status_code == 400


def test_mesero_no_ve_reportes(client, mesero):
    assert client.get(f"{API}/reportes/mas-vendidos", headers=mesero).status_code == 403
