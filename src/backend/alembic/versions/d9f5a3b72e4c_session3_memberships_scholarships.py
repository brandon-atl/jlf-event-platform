"""Session 3: memberships, scholarship_links, attendee membership columns

Revision ID: d9f5a3b72e4c
Revises: c8e4f2a61d3b
Create Date: 2026-02-27 10:00:00.000000

Changes:
- NEW TABLE memberships
- NEW TABLE scholarship_links
- ADD to attendees: is_member, membership_id (FK), admin_notes
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9f5a3b72e4c"
down_revision: Union[str, None] = "c8e4f2a61d3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # NEW TABLE: memberships                                               #
    # ------------------------------------------------------------------ #
    op.create_table(
        "memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("attendee_id", sa.Uuid(), nullable=False),
        sa.Column(
            "tier",
            sa.String(length=50),
            nullable=False,
            server_default="standard",
        ),
        sa.Column(
            "discount_type",
            sa.String(length=20),
            nullable=False,
            server_default="flat",
        ),
        sa.Column(
            "discount_value_cents",
            sa.Integer(),
            nullable=False,
            server_default="2500",
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["attendee_id"],
            ["attendees.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_memberships_attendee_active",
        "memberships",
        ["attendee_id"],
        unique=False,
    )

    # ------------------------------------------------------------------ #
    # NEW TABLE: scholarship_links                                         #
    # ------------------------------------------------------------------ #
    op.create_table(
        "scholarship_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("attendee_id", sa.Uuid(), nullable=True),
        sa.Column(
            "code",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "scholarship_price_cents",
            sa.Integer(),
            nullable=False,
            server_default="3000",
        ),
        sa.Column("stripe_coupon_id", sa.String(length=100), nullable=True),
        sa.Column(
            "max_uses",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "uses",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
        ),
        sa.ForeignKeyConstraint(
            ["attendee_id"],
            ["attendees.id"],
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_scholarship_links_code",
        "scholarship_links",
        ["code"],
        unique=True,
    )

    # ------------------------------------------------------------------ #
    # ADD columns to attendees (batch for SQLite compat)                   #
    # ------------------------------------------------------------------ #
    with op.batch_alter_table("attendees") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_member",
                sa.Boolean(),
                nullable=False,
                server_default="false",
            ),
        )
        batch_op.add_column(
            sa.Column("membership_id", sa.Uuid(), nullable=True),
        )
        batch_op.add_column(
            sa.Column("admin_notes", sa.Text(), nullable=True),
        )
        batch_op.create_foreign_key(
            "fk_attendees_membership_id",
            "memberships",
            ["membership_id"],
            ["id"],
        )


def downgrade() -> None:
    # Remove attendee columns
    with op.batch_alter_table("attendees") as batch_op:
        batch_op.drop_constraint("fk_attendees_membership_id", type_="foreignkey")
        batch_op.drop_column("admin_notes")
        batch_op.drop_column("membership_id")
        batch_op.drop_column("is_member")

    # Drop new tables
    op.drop_index("ix_scholarship_links_code", table_name="scholarship_links")
    op.drop_table("scholarship_links")
    op.drop_index("ix_memberships_attendee_active", table_name="memberships")
    op.drop_table("memberships")
