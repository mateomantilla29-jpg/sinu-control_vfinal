"""
Configuracion de pruebas y fixtures compartidos.

IMPORTANTE: Las variables de entorno de testing se definen ANTES de
importar la app para evitar que `load_dotenv()` en `app/config.py`
cargue la configuracion de base de datos del `.env` del desarrollador.

Por defecto se usa SQLite en memoria. Para correr la MISMA suite contra MySQL:
    TEST_DATABASE_URL=mysql+pymysql://usuario:clave@localhost:3306/sinu_test python -m pytest
"""

import os

# ── Variables de testing ANTES de cualquier import de la app ─────────
os.environ["FLASK_TESTING"] = "true"
os.environ["SECRET_KEY"] = "test-key-for-pytest"
os.environ["JWT_EXP_MINUTES"] = "15"

# ── Imports de la app (ahora usaran la config de testing) ────────────
import pytest

from app import crear_app, db
from app.semilla import cargar_datos_ejemplo

API = "/api/v1"


@pytest.fixture
def app():
    """App en modo testing con los datos de ejemplo de SINU (tablas recreadas en cada test)."""
    app = crear_app()
    with app.app_context():
        servicios = app.extensions["sinu_servicios"]
        cargar_datos_ejemplo(servicios["inventario"], servicios["platos"], recrear_tablas=True)
        yield app
        db.session.remove()


@pytest.fixture
def client(app):
    """Cliente HTTP para pruebas."""
    return app.test_client()


def login(client, usuario, contrasena):
    return client.post(f"{API}/usuarios/login", json={"usuario": usuario, "contrasena": contrasena})


def headers_de(client, usuario, contrasena):
    token = login(client, usuario, contrasena).get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# Compatibilidad con test_sinu.py
_headers = headers_de


@pytest.fixture
def admin(client):
    return headers_de(client, "admin", "admin123")


@pytest.fixture
def mesero(client):
    return headers_de(client, "mesero", "mesero123")


# ── Ayudas para crear datos por la API ───────────────────────────────


def plato_id(client, headers, nombre):
    menu = client.get(f"{API}/platos", headers=headers).get_json()["data"]
    return next(f["plato"]["id"] for f in menu if f["plato"]["nombre"] == nombre)


def crear_pedido(client, headers, nombre_plato, cantidad=1, mesa="1"):
    pid = plato_id(client, headers, nombre_plato)
    resp = client.post(
        f"{API}/pedidos", headers=headers, json={"mesa": mesa, "items": [{"plato_id": pid, "cantidad": cantidad}]}
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["data"]


def insumo(client, admin, nombre):
    filas = client.get(f"{API}/insumos", headers=admin).get_json()["data"]
    return next(f for f in filas if f["insumo"]["nombre"] == nombre)


def lotes(client, admin, todos=False):
    return client.get(f"{API}/lotes{'?todos=1' if todos else ''}", headers=admin).get_json()["data"]
