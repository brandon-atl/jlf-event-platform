"""add checkin columns to registrations

Revision ID: b7f3a1e92c5d
Revises: a3f7c9d21b4e
Create Date: 2026-02-25 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b7f3a1e92c5d'
down_revision: Union[str, None] = 'a3f7c9d21b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('registrations', sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('registrations', sa.Column('checked_in_by', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('registrations', 'checked_in_by')
    op.drop_column('registrations', 'checked_in_at')
