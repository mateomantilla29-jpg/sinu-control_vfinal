"""usuarios activos y cierres de caja

Revision ID: 44ad22de8adc
Revises: a1b2c3d4e5f6
Create Date: 2026-11-19 15:25:59.897903

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44ad22de8adc'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Generado con flask db migrate y revisado a mano
    op.create_table('cierres_caja',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('fecha', sa.Date(), nullable=False),
    sa.Column('pedidos_entregados', sa.Integer(), nullable=False),
    sa.Column('total_entregados', sa.Integer(), nullable=False),
    sa.Column('pedidos_cancelados', sa.Integer(), nullable=False),
    sa.Column('total_cancelados', sa.Integer(), nullable=False),
    sa.Column('total_ventas', sa.Integer(), nullable=False),
    sa.Column('observacion', sa.String(length=255), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=True),
    sa.Column('usuario_nombre', sa.String(length=100), nullable=False),
    sa.Column('fecha_cierre', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('fecha')
    )
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.add_column(sa.Column('activo', sa.Boolean(), server_default=sa.text('true'), nullable=False))



def downgrade():
    # Generado con flask db migrate y revisado a mano
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_column('activo')

    op.drop_table('cierres_caja')
