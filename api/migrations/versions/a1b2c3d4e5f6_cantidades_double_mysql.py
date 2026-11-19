"""cantidades en DOUBLE para MySQL

En MySQL, sa.Float crea columnas FLOAT de precision simple (4 bytes): 0.15 kg se
guardaba como 0.150000006 y podia romper las comparaciones de stock de FEFO.
Se pasan todas las cantidades a DOUBLE (8 bytes). En SQLite no cambia nada.

Revision ID: a1b2c3d4e5f6
Revises: 11a44f46c8f2
Create Date: 2026-11-19 10:00:00

"""
import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "11a44f46c8f2"
branch_labels = None
depends_on = None

COLUMNAS = [
    ("insumos", "stock_minimo"),
    ("lotes", "cantidad_inicial"),
    ("lotes", "cantidad_actual"),
    ("movimientos", "cantidad"),
    ("receta_items", "cantidad"),
    ("consumos", "cantidad"),
]


def _cambiar(tipo_origen, tipo_destino):
    for tabla, columna in COLUMNAS:
        with op.batch_alter_table(tabla) as batch:
            batch.alter_column(
                columna, existing_type=tipo_origen, type_=tipo_destino, existing_nullable=False
            )


def upgrade():
    _cambiar(sa.Float(), sa.Double())


def downgrade():
    _cambiar(sa.Double(), sa.Float())
