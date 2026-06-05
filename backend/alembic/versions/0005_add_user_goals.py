"""add user_goals table

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False, unique=True),
        sa.Column('target_cpm', sa.Integer(), nullable=False),
        sa.Column('deadline', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_user_goals_user_id', 'user_goals', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_goals_user_id', table_name='user_goals')
    op.drop_table('user_goals')
