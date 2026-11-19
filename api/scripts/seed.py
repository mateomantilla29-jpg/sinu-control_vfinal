"""
Carga los datos de ejemplo de SINU (usuarios, insumos, lotes y platos) en MySQL.

Requisito: haber creado las tablas con `flask db upgrade`.

ATENCION: borra todas las filas (pedidos, inventario, platos, usuarios) antes de
cargar. Por eso pide confirmacion escribiendo SI (o se puede pasar --si).

Uso (desde la carpeta api/):
    python scripts/seed.py              # pide confirmacion
    python scripts/seed.py --si         # sin confirmacion
    python scripts/seed.py --si-vacia   # solo carga si no hay usuarios (lanzador)
"""

import os
import sys

# Permite ejecutar el script desde api/ sin instalar el paquete
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import inspect  # noqa: E402

from app import crear_app, db  # noqa: E402
from app.semilla import cargar_datos_ejemplo  # noqa: E402


def main():
    app = crear_app()
    with app.app_context():
        if "usuarios" not in inspect(db.engine).get_table_names():
            print("No existen las tablas. Ejecute primero: flask db upgrade")
            sys.exit(1)

        from app.dominios.usuarios.modelos import Usuario

        if "--si-vacia" in sys.argv:
            if db.session.query(Usuario).count():
                print("La base ya tiene datos. No se modifico nada.")
                return
        elif "--si" not in sys.argv:
            respuesta = input(
                "Esto BORRARA todos los datos (pedidos, inventario, platos, usuarios) y "
                "cargara los de ejemplo.\nEscriba SI para continuar: "
            )
            if respuesta.strip().upper() != "SI":
                print("Cancelado. No se modifico nada.")
                return

        servicios = app.extensions["sinu_servicios"]
        cargar_datos_ejemplo(servicios["inventario"], servicios["platos"])
    print("Datos de ejemplo cargados. Usuarios de prueba: ver README (seccion Usuarios de prueba).")


if __name__ == "__main__":
    main()
