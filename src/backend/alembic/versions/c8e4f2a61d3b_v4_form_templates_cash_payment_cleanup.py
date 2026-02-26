"""v4: form_templates, event_form_links, cash payment, schema cleanup

Revision ID: c8e4f2a61d3b
Revises: b7f3a1e92c5d
Create Date: 2026-02-26 10:00:00.000000

Changes:
- NEW TABLE form_templates
- NEW TABLE event_form_links
- ADD to events: allow_cash_payment, max_member_discount_slots, location_text, zoom_link
- REMOVE from events: reminder_delay_minutes, auto_expire_hours
- ADD to registrations: payment_method, group_id, estimated_arrival
- REMOVE from registrations: reminder_sent_at, escalation_sent_at
- DATA: migrate accommodation_type nylon_tent→tipi_twin, yurt_shared→none
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import Text
from sqlalchemy.dialects import postgresql

revision: str = "c8e4f2a61d3b"
down_revision: Union[str, None] = "b7f3a1e92c5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # NEW TABLE: form_templates                                            #
    # ------------------------------------------------------------------ #
    op.create_table(
        "form_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "form_type",
            sa.Enum(
                "intake",
                "waiver",
                "accommodation",
                "dietary",
                "travel",
                "logistics",
                "health",
                "legal",
                "custom",
                name="formtype",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "fields", postgresql.JSONB(astext_type=Text()), nullable=True
        ),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_form_templates_form_type", "form_templates", ["form_type"], unique=False
    )

    # ------------------------------------------------------------------ #
    # NEW TABLE: event_form_links                                          #
    # ------------------------------------------------------------------ #
    op.create_table(
        "event_form_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("form_template_id", sa.Uuid(), nullable=False),
        sa.Column("is_waiver", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
        ),
        sa.ForeignKeyConstraint(
            ["form_template_id"],
            ["form_templates.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id", "form_template_id", name="uq_event_form_template"
        ),
    )
    op.create_index(
        "ix_event_form_links_event_sort",
        "event_form_links",
        ["event_id", "sort_order"],
        unique=False,
    )

    # ------------------------------------------------------------------ #
    # ADD columns to events                                                #
    # ------------------------------------------------------------------ #
    op.add_column(
        "events",
        sa.Column(
            "allow_cash_payment",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "events",
        sa.Column(
            "max_member_discount_slots",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )
    op.add_column(
        "events",
        sa.Column("location_text", sa.Text(), nullable=True),
    )
    op.add_column(
        "events",
        sa.Column("zoom_link", sa.String(length=500), nullable=True),
    )

    # ------------------------------------------------------------------ #
    # REMOVE columns from events                                           #
    # ------------------------------------------------------------------ #
    op.drop_column("events", "reminder_delay_minutes")
    op.drop_column("events", "auto_expire_hours")

    # ------------------------------------------------------------------ #
    # ADD columns to registrations                                         #
    # ------------------------------------------------------------------ #
    op.add_column(
        "registrations",
        sa.Column(
            "payment_method",
            sa.String(length=20),
            nullable=False,
            server_default="stripe",
        ),
    )
    op.add_column(
        "registrations",
        sa.Column("group_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "registrations",
        sa.Column("estimated_arrival", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_registrations_group_id", "registrations", ["group_id"], unique=False
    )

    # ------------------------------------------------------------------ #
    # REMOVE columns from registrations                                    #
    # ------------------------------------------------------------------ #
    op.drop_column("registrations", "reminder_sent_at")
    op.drop_column("registrations", "escalation_sent_at")

    # ------------------------------------------------------------------ #
    # DATA MIGRATION: accommodation_type enum rename                       #
    # nylon_tent → tipi_twin, yurt_shared → none                         #
    # ------------------------------------------------------------------ #
    op.execute(
        "UPDATE registrations SET accommodation_type = 'tipi_twin' "
        "WHERE accommodation_type = 'nylon_tent'"
    )
    op.execute(
        "UPDATE registrations SET accommodation_type = 'none' "
        "WHERE accommodation_type = 'yurt_shared'"
    )


def downgrade() -> None:
    # Restore removed registration columns
    op.add_column(
        "registrations",
        sa.Column("escalation_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "registrations",
        sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Remove added registration columns
    op.drop_index("ix_registrations_group_id", table_name="registrations")
    op.drop_column("registrations", "estimated_arrival")
    op.drop_column("registrations", "group_id")
    op.drop_column("registrations", "payment_method")

    # Restore removed event columns
    op.add_column(
        "events",
        sa.Column("auto_expire_hours", sa.Integer(), nullable=False, server_default="24"),
    )
    op.add_column(
        "events",
        sa.Column(
            "reminder_delay_minutes", sa.Integer(), nullable=False, server_default="60"
        ),
    )

    # Remove added event columns
    op.drop_column("events", "zoom_link")
    op.drop_column("events", "location_text")
    op.drop_column("events", "max_member_discount_slots")
    op.drop_column("events", "allow_cash_payment")

    # Drop new tables
    op.drop_index("ix_event_form_links_event_sort", table_name="event_form_links")
    op.drop_table("event_form_links")
    op.drop_index("ix_form_templates_form_type", table_name="form_templates")
    op.drop_table("form_templates")
