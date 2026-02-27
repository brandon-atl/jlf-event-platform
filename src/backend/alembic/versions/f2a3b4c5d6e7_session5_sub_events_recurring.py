"""Session 5: Add sub_events, registration_sub_events tables and recurring event fields.

Revision ID: f2a3b4c5d6e7
Revises: e1a2b3c4d5f6
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "f2a3b4c5d6e7"
down_revision = "e1a2b3c4d5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add recurring fields to events table
    op.add_column("events", sa.Column("is_recurring", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("events", sa.Column("recurrence_rule", sa.String(255), nullable=True))

    # Create sub_events table
    op.create_table(
        "sub_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("parent_event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "pricing_model",
            sa.String(20),
            nullable=False,
        ),
        sa.Column("fixed_price_cents", sa.Integer(), nullable=True),
        sa.Column("min_donation_cents", sa.Integer(), nullable=True),
        sa.Column("stripe_price_id", sa.String(100), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sub_events_parent_event_id", "sub_events", ["parent_event_id"])

    # Create registration_sub_events table
    op.create_table(
        "registration_sub_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("registration_id", sa.Uuid(), sa.ForeignKey("registrations.id"), nullable=False),
        sa.Column("sub_event_id", sa.Uuid(), sa.ForeignKey("sub_events.id"), nullable=False),
        sa.Column("payment_amount_cents", sa.Integer(), nullable=True),
        sa.UniqueConstraint("registration_id", "sub_event_id", name="uq_registration_sub_event"),
    )
    op.create_index("ix_registration_sub_events_registration_id", "registration_sub_events", ["registration_id"])
    op.create_index("ix_registration_sub_events_sub_event_id", "registration_sub_events", ["sub_event_id"])


def downgrade() -> None:
    op.drop_index("ix_registration_sub_events_sub_event_id", table_name="registration_sub_events")
    op.drop_index("ix_registration_sub_events_registration_id", table_name="registration_sub_events")
    op.drop_table("registration_sub_events")
    op.drop_table("sub_events")
    op.drop_column("events", "recurrence_rule")
    op.drop_column("events", "is_recurring")
