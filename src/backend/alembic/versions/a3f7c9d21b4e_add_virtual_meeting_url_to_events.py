"""add virtual_meeting_url to events

Revision ID: a3f7c9d21b4e
Revises: 1ee28eb6f71e
Create Date: 2026-02-24 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3f7c9d21b4e'
down_revision: Union[str, None] = '1ee28eb6f71e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('virtual_meeting_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'virtual_meeting_url')
