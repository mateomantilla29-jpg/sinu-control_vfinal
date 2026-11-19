"""B2 · Mi perfil y cambio de contrasena. B6 · Renovacion y expiracion del token."""

from datetime import UTC, datetime, timedelta

import jwt

from tests.conftest import API, login

CAMBIO = {"actual": "mesero123", "nueva": "nueva456", "confirmacion": "nueva456"}


def test_cambiar_contrasena_y_entrar_con_la_nueva(client, mesero):
    resp = client.patch(f"{API}/usuarios/yo/contrasena", headers=mesero, json=CAMBIO)
    assert resp.status_code == 200
    assert login(client, "mesero", "nueva456").status_code == 200
    assert login(client, "mesero", "mesero123").status_code == 401


def test_contrasena_actual_incorrecta(client, mesero):
    resp = client.patch(f"{API}/usuarios/yo/contrasena", headers=mesero, json={**CAMBIO, "actual": "mala"})
    assert resp.status_code == 400
    assert "actual" in resp.get_json()["error"]["details"]


def test_confirmacion_distinta_y_nueva_corta(client, mesero):
    resp = client.patch(
        f"{API}/usuarios/yo/contrasena", headers=mesero, json={"actual": "mesero123", "nueva": "123", "confirmacion": "x"}
    )
    assert resp.status_code == 400
    assert "nueva" in resp.get_json()["error"]["details"]

    resp = client.patch(f"{API}/usuarios/yo/contrasena", headers=mesero, json={**CAMBIO, "confirmacion": "otra456"})
    assert resp.status_code == 400
    assert "confirmacion" in resp.get_json()["error"]["details"]


def test_cambiar_contrasena_sin_token(client):
    assert client.patch(f"{API}/usuarios/yo/contrasena", json=CAMBIO).status_code == 401


def test_actualizar_mi_nombre(client, mesero):
    resp = client.put(f"{API}/usuarios/yo", headers=mesero, json={"nombre": "Carlos (mesero)"})
    assert resp.status_code == 200
    assert client.get(f"{API}/usuarios/yo", headers=mesero).get_json()["data"]["nombre"] == "Carlos (mesero)"
    assert client.put(f"{API}/usuarios/yo", headers=mesero, json={"nombre": ""}).status_code == 400


def test_renovar_token_entrega_uno_nuevo_valido(client, mesero):
    resp = client.post(f"{API}/usuarios/token/renovar", headers=mesero)
    assert resp.status_code == 200
    nuevo = {"Authorization": f"Bearer {resp.get_json()['data']['access_token']}"}
    assert client.get(f"{API}/mesas", headers=nuevo).status_code == 200


def test_token_expirado_responde_401_con_mensaje(client, app):
    pasado = datetime.now(UTC) - timedelta(minutes=1)
    token = jwt.encode({"sub": "1", "rol": "admin", "exp": pasado}, app.config["SECRET_KEY"], algorithm="HS256")
    resp = client.get(f"{API}/mesas", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.get_json()["error"]["message"] == "Token expirado."
    assert client.post(f"{API}/usuarios/token/renovar", headers={"Authorization": f"Bearer {token}"}).status_code == 401
