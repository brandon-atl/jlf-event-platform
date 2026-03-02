"""Session 12: Add expenses, event_settlements, and operating_expenses tables, extend event_co_creators and co_creators.

Revision ID: h4c5d6e7f8g9
Revises: g3b4c5d6e7f8
Create Date: 2026-03-01
"""

from alembic import op
import sqlalchemy as sa

revision = "h4c5d6e7f8g9"
down_revision = "g3b4c5d6e7f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create expenses table
    op.create_table(
        "expenses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("submitted_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_type", sa.String(20), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("receipt_image_url", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_expenses_event_id", "expenses", ["event_id"])

    # Create event_settlements table
    op.create_table(
        "event_settlements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("event_id", sa.Uuid(), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("gross_revenue_cents", sa.Integer(), nullable=False),
        sa.Column("stripe_fees_cents", sa.Integer(), nullable=False),
        sa.Column("total_expenses_cents", sa.Integer(), nullable=False),
        sa.Column("net_cents", sa.Integer(), nullable=False),
        sa.Column("split_config", sa.JSON(), nullable=False),
        sa.Column("fees_estimated", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("calculated_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_event_settlements_event_id_version", "event_settlements", ["event_id", "version"])

    # Create operating_expenses table
    op.create_table(
        "operating_expenses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("submitted_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("receipt_image_url", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("reimbursed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("reimbursed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_operating_expenses_expense_date", "operating_expenses", ["expense_date"])

    # Add columns to event_co_creators table
    op.add_column("event_co_creators", sa.Column("can_upload_expenses", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("event_co_creators", sa.Column("split_percentage", sa.Numeric(5, 2), nullable=True))

    # Add column to co_creators table
    op.add_column("co_creators", sa.Column("venmo_handle", sa.String(100), nullable=True))


def downgrade() -> None:
    # Remove columns from co_creators table
    op.drop_column("co_creators", "venmo_handle")

    # Remove columns from event_co_creators table
    op.drop_column("event_co_creators", "split_percentage")
    op.drop_column("event_co_creators", "can_upload_expenses")

    # Drop operating_expenses table
    op.drop_index("ix_operating_expenses_expense_date", "operating_expenses")
    op.drop_table("operating_expenses")

    # Drop event_settlements table
    op.drop_index("ix_event_settlements_event_id_version", "event_settlements")
    op.drop_table("event_settlements")

    # Drop expenses table
    op.drop_index("ix_expenses_event_id", "expenses")
    op.drop_table("expenses")