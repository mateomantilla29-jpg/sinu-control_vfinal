"""B3 · Mermas y baja de lotes vencidos (cada una deja un movimiento 'merma')."""

from tests.conftest import API, insumo, lotes


def _lote(client, admin, nombre, estado):
    return next(l for l in lotes(client, admin) if l["insumo"] == nombre and l["estado"] == estado)


def _mermas(client, admin):
    return client.get(f"{API}/reportes/movimientos?tipo=merma", headers=admin).get_json()["data"]["filas"]


def test_merma_parcial_baja_stock_y_queda_en_historial(client, admin):
    lote = _lote(client, admin, "Arroz", "activo")  # 20 kg
    resp = client.post(f"{API}/lotes/{lote['id']}/merma", headers=admin, json={"cantidad": 1.5, "motivo": "Bolsa rota"})
    assert resp.status_code == 201
    assert resp.get_json()["data"]["cantidad_actual"] == 18.5
    assert insumo(client, admin, "Arroz")["disponible"] == 18.5

    historial = _mermas(client, admin)
    assert historial[0]["cantidad"] == -1.5
    assert "Bolsa rota" in historial[0]["nota"]


def test_merma_mayor_que_el_lote_es_conflicto(client, admin):
    lote = _lote(client, admin, "Arroz", "activo")
    resp = client.post(f"{API}/lotes/{lote['id']}/merma", headers=admin, json={"cantidad": 21, "motivo": "Exceso"})
    assert resp.status_code == 409
    assert insumo(client, admin, "Arroz")["disponible"] == 20


def test_merma_valida_cantidad_y_motivo(client, admin):
    lote = _lote(client, admin, "Arroz", "activo")
    resp = client.post(f"{API}/lotes/{lote['id']}/merma", headers=admin, json={"cantidad": 0, "motivo": ""})
    assert resp.status_code == 400
    assert set(resp.get_json()["error"]["details"]) == {"cantidad", "motivo"}
    assert client.post(f"{API}/lotes/9999/merma", headers=admin, json={"cantidad": 1, "motivo": "abc"}).status_code == 404


def test_mesero_no_registra_mermas(client, mesero):
    assert client.post(f"{API}/lotes/1/merma", headers=mesero, json={"cantidad": 1, "motivo": "abc"}).status_code == 403
    assert client.post(f"{API}/lotes/vencidos/baja", headers=mesero).status_code == 403


def test_baja_solo_para_lotes_vencidos(client, admin):
    activo = _lote(client, admin, "Arroz", "activo")
    assert client.post(f"{API}/lotes/{activo['id']}/baja", headers=admin).status_code == 409

    vencido = _lote(client, admin, "Calamar", "vencido")  # 1,5 kg
    resp = client.post(f"{API}/lotes/{vencido['id']}/baja", headers=admin)
    assert resp.status_code == 200
    assert resp.get_json()["data"]["estado"] == "mermado"
    assert insumo(client, admin, "Calamar")["vencido"] == 0
    assert _mermas(client, admin)[0]["cantidad"] == -1.5

    alertas = client.get(f"{API}/alertas", headers=admin).get_json()["data"]
    assert not any(a["tipo"] == "lote-vencido" and a["lote_id"] == vencido["id"] for a in alertas)


def test_baja_masiva_de_vencidos(client, admin):
    resp = client.post(f"{API}/lotes/vencidos/baja", headers=admin)
    assert resp.status_code == 200
    assert resp.get_json()["data"]["lotes"] == 2  # Calamar y Leche de coco
    assert not [l for l in lotes(client, admin) if l["estado"] == "vencido"]
    assert len(_mermas(client, admin)) == 2
