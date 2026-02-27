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
- UPDATE CHECK constraints for new enum values
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

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
        sa.Column("fields", sa.JSON(), nullable=True),
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
    # ADD columns to events (batch for SQLite compat)                      #
    # ------------------------------------------------------------------ #
    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(
            sa.Column(
                "allow_cash_payment",
                sa.Boolean(),
                nullable=False,
                server_default="false",
            ),
        )
        batch_op.add_column(
            sa.Column(
                "max_member_discount_slots",
                sa.Integer(),
                nullable=False,
                server_default="3",
            ),
        )
        batch_op.add_column(
            sa.Column("location_text", sa.Text(), nullable=True),
        )
        batch_op.add_column(
            sa.Column("zoom_link", sa.String(length=500), nullable=True),
        )
        # REMOVE columns from events
        batch_op.drop_column("reminder_delay_minutes")
        batch_op.drop_column("auto_expire_hours")

    # ------------------------------------------------------------------ #
    # UPDATE CHECK constraint: pricing_model (add 'composite')             #
    # ------------------------------------------------------------------ #
    with op.batch_alter_table("events") as batch_op:
        # Drop old constraint and create new one with 'composite' added
        batch_op.drop_constraint("ck_events_pricing_model", type_="check")
        batch_op.create_check_constraint(
            "ck_events_pricing_model",
            sa.column("pricing_model").in_(["fixed", "donation", "free", "composite"]),
        )

    # ------------------------------------------------------------------ #
    # ADD columns to registrations (batch for SQLite compat)               #
    # ------------------------------------------------------------------ #
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.add_column(
            sa.Column(
                "payment_method",
                sa.Enum(
                    "stripe",
                    "cash",
                    "scholarship",
                    "free",
                    name="paymentmethod",
                    native_enum=False,
                ),
                nullable=False,
                server_default="stripe",
            ),
        )
        batch_op.add_column(
            sa.Column("group_id", sa.Uuid(), nullable=True),
        )
        batch_op.add_column(
            sa.Column("estimated_arrival", sa.DateTime(timezone=True), nullable=True),
        )
        # REMOVE columns from registrations
        batch_op.drop_column("reminder_sent_at")
        batch_op.drop_column("escalation_sent_at")

    op.create_index(
        "ix_registrations_group_id", "registrations", ["group_id"], unique=False
    )

    # ------------------------------------------------------------------ #
    # UPDATE CHECK constraints for new enum values                         #
    # ------------------------------------------------------------------ #

    # registrations.status: add 'cash_pending'
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_constraint("ck_registrations_status", type_="check")
        batch_op.create_check_constraint(
            "ck_registrations_status",
            sa.column("status").in_([
                "pending_payment", "cash_pending", "complete",
                "expired", "cancelled", "refunded",
            ]),
        )

    # registrations.accommodation_type: update to new values
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_constraint("ck_registrations_accommodation_type", type_="check")
        batch_op.create_check_constraint(
            "ck_registrations_accommodation_type",
            sa.column("accommodation_type").in_([
                "bell_tent", "tipi_twin", "self_camping", "day_only", "none",
            ]),
        )

    # registrations.source: add 'group'
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_constraint("ck_registrations_source", type_="check")
        batch_op.create_check_constraint(
            "ck_registrations_source",
            sa.column("source").in_([
                "registration_form", "manual", "walk_in", "group",
            ]),
        )

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
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.add_column(
            sa.Column("escalation_sent_at", sa.DateTime(timezone=True), nullable=True),
        )
        batch_op.add_column(
            sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        )

    # Remove added registration columns
    op.drop_index("ix_registrations_group_id", table_name="registrations")
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_column("estimated_arrival")
        batch_op.drop_column("group_id")
        batch_op.drop_column("payment_method")

    # Restore CHECK constraints to original values
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_constraint("ck_registrations_status", type_="check")
        batch_op.create_check_constraint(
            "ck_registrations_status",
            sa.column("status").in_([
                "pending_payment", "complete", "expired", "cancelled", "refunded",
            ]),
        )
        batch_op.drop_constraint("ck_registrations_accommodation_type", type_="check")
        batch_op.create_check_constraint(
            "ck_registrations_accommodation_type",
            sa.column("accommodation_type").in_([
                "bell_tent", "nylon_tent", "self_camping", "yurt_shared", "none",
            ]),
        )
        batch_op.drop_constraint("ck_registrations_source", type_="check")
        batch_op.create_check_constraint(
            "ck_registrations_source",
            sa.column("source").in_([
                "registration_form", "manual", "walk_in",
            ]),
        )

    # Restore removed event columns
    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(
            sa.Column("auto_expire_hours", sa.Integer(), nullable=False, server_default="24"),
        )
        batch_op.add_column(
            sa.Column(
                "reminder_delay_minutes", sa.Integer(), nullable=False, server_default="60"
            ),
        )

    # Remove added event columns
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("zoom_link")
        batch_op.drop_column("location_text")
        batch_op.drop_column("max_member_discount_slots")
        batch_op.drop_column("allow_cash_payment")

    # Restore pricing_model constraint
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_constraint("ck_events_pricing_model", type_="check")
        batch_op.create_check_constraint(
            "ck_events_pricing_model",
            sa.column("pricing_model").in_(["fixed", "donation", "free"]),
        )

    # Drop new tables
    op.drop_index("ix_event_form_links_event_sort", table_name="event_form_links")
    op.drop_table("event_form_links")
    op.drop_index("ix_form_templates_form_type", table_name="form_templates")
    op.drop_table("form_templates")
