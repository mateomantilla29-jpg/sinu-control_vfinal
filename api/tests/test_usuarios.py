"""B1 · Gestion de usuarios (solo Administrador)."""

from tests.conftest import API, headers_de, login

NUEVO = {"usuario": "ana.perez", "nombre": "Ana Pérez", "rol": "mesero", "contrasena": "clave123"}


def _crear(client, admin, **cambios):
    return client.post(f"{API}/usuarios", headers=admin, json={**NUEVO, **cambios})


def test_admin_crea_usuario_y_este_inicia_sesion(client, admin):
    resp = _crear(client, admin)
    assert resp.status_code == 201
    assert resp.get_json()["data"]["activo"] is True
    assert "contrasena" not in resp.get_json()["data"]
    assert login(client, "ana.perez", "clave123").status_code == 200


def test_crear_usuario_valida_cada_campo(client, admin):
    resp = client.post(
        f"{API}/usuarios", headers=admin, json={"usuario": "Ana P", "nombre": "", "rol": "chef", "contrasena": "12"}
    )
    assert resp.status_code == 400
    assert set(resp.get_json()["error"]["details"]) == {"usuario", "nombre", "rol", "contrasena"}


def test_usuario_duplicado_es_conflicto(client, admin):
    assert _crear(client, admin, usuario="mesero").status_code == 409


def test_mesero_no_gestiona_usuarios(client, mesero):
    assert client.get(f"{API}/usuarios", headers=mesero).status_code == 403
    assert client.post(f"{API}/usuarios", headers=mesero, json=NUEVO).status_code == 403


def test_admin_edita_nombre_rol_y_restablece_contrasena(client, admin):
    uid = _crear(client, admin).get_json()["data"]["id"]
    resp = client.put(
        f"{API}/usuarios/{uid}", headers=admin, json={"nombre": "Ana P.", "rol": "admin", "contrasena": "otra456"}
    )
    assert resp.status_code == 200
    assert resp.get_json()["data"]["rol"] == "admin"
    assert login(client, "ana.perez", "otra456").status_code == 200


def test_desactivar_bloquea_login_y_token_abierto(client, admin):
    uid = _crear(client, admin).get_json()["data"]["id"]
    token_ana = headers_de(client, "ana.perez", "clave123")

    resp = client.patch(f"{API}/usuarios/{uid}/estado", headers=admin, json={"activo": False})
    assert resp.status_code == 200 and resp.get_json()["data"]["activo"] is False

    assert login(client, "ana.perez", "clave123").status_code == 401
    assert client.get(f"{API}/mesas", headers=token_ana).status_code == 401

    client.patch(f"{API}/usuarios/{uid}/estado", headers=admin, json={"activo": True})
    assert login(client, "ana.perez", "clave123").status_code == 200


def test_nadie_se_desactiva_ni_cambia_su_rol(client, admin):
    yo = client.get(f"{API}/usuarios/yo", headers=admin).get_json()["data"]["id"]
    assert client.patch(f"{API}/usuarios/{yo}/estado", headers=admin, json={"activo": False}).status_code == 409
    assert (
        client.put(f"{API}/usuarios/{yo}", headers=admin, json={"nombre": "Admin", "rol": "mesero"}).status_code
        == 409
    )


def test_estado_requiere_booleano_y_usuario_existente(client, admin):
    assert client.patch(f"{API}/usuarios/2/estado", headers=admin, json={}).status_code == 400
    assert client.patch(f"{API}/usuarios/999/estado", headers=admin, json={"activo": False}).status_code == 404
