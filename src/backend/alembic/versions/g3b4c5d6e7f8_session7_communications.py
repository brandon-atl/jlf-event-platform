"""Session 7: Add message_templates and sms_conversations tables, extend webhooks_raw.

Revision ID: g3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "g3b4c5d6e7f8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create message_templates table
    op.create_table(
        "message_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("channel", sa.String(10), nullable=False),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("variables", sa.JSON(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_message_templates_category", "message_templates", ["category"])

    # Create sms_conversations table
    op.create_table(
        "sms_conversations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("registration_id", sa.Uuid(), sa.ForeignKey("registrations.id"), nullable=True),
        sa.Column("attendee_phone", sa.String(20), nullable=False),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("twilio_sid", sa.String(100), nullable=True),
        sa.Column("sent_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sms_conversations_phone", "sms_conversations", ["attendee_phone"])
    op.create_index("ix_sms_conversations_phone_created", "sms_conversations", ["attendee_phone", "created_at"])

    # Extend webhooks_raw: add source and twilio_sid columns
    with op.batch_alter_table("webhooks_raw") as batch_op:
        batch_op.add_column(sa.Column("source", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("twilio_sid", sa.String(255), nullable=True))
        batch_op.alter_column("stripe_event_id", existing_type=sa.String(255), nullable=True)

    # Seed default message templates
    message_templates = sa.table(
        "message_templates",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String),
        sa.column("category", sa.String),
        sa.column("channel", sa.String),
        sa.column("subject", sa.String),
        sa.column("body", sa.Text),
        sa.column("variables", sa.JSON),
        sa.column("is_default", sa.Boolean),
    )

    import uuid
    op.bulk_insert(message_templates, [
        {
            "id": str(uuid.uuid4()),
            "name": "24h Event Reminder",
            "category": "reminder",
            "channel": "both",
            "subject": "Reminder: {{event_name}} is tomorrow!",
            "body": "Hi {{first_name}}, just a friendly reminder that {{event_name}} is tomorrow, {{event_date}}! We're looking forward to seeing you at Just Love Forest. Your meeting point: {{meeting_point}}. If you need to cancel, visit: {{cancel_url}}",
            "variables": ["first_name", "event_name", "event_date", "meeting_point", "cancel_url"],
            "is_default": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "1 Week Reminder",
            "category": "reminder",
            "channel": "both",
            "subject": "{{event_name}} is coming up on {{event_date}}!",
            "body": "Hi {{first_name}}, {{event_name}} is coming up on {{event_date}}! We're excited to welcome you to Just Love Forest. If you have any questions, feel free to reach out. If you need to cancel, visit: {{cancel_url}}",
            "variables": ["first_name", "event_name", "event_date", "cancel_url"],
            "is_default": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Day-Of Logistics",
            "category": "day_of",
            "channel": "sms",
            "subject": None,
            "body": "Hi {{first_name}}! Today is the day — {{event_name}}. Your meeting point: {{meeting_point}}. See you soon!",
            "variables": ["first_name", "event_name", "meeting_point"],
            "is_default": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Post-Event Thank You",
            "category": "post_event",
            "channel": "both",
            "subject": "Thank you for joining {{event_name}}!",
            "body": "Thank you for joining us at {{event_name}}, {{first_name}}! We hope you had a wonderful experience at Just Love Forest. We'd love to see you again soon.",
            "variables": ["first_name", "event_name"],
            "is_default": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cancellation Confirmation",
            "category": "cancellation",
            "channel": "email",
            "subject": "Cancellation request received for {{event_name}}",
            "body": "Hi {{first_name}}, we received your cancellation request for {{event_name}} on {{event_date}}. Our team will review your request and follow up shortly. If you have any questions, please don't hesitate to reach out.",
            "variables": ["first_name", "event_name", "event_date"],
            "is_default": True,
        },
    ])


def downgrade() -> None:
    # Safety: remove Twilio-originated rows (no stripe_event_id) before restoring NOT NULL.
    # batch_alter_table ensures SQLite compatibility for the column change.
    op.execute("DELETE FROM webhooks_raw WHERE stripe_event_id IS NULL OR stripe_event_id = ''")
    with op.batch_alter_table("webhooks_raw") as batch_op:
        batch_op.alter_column("stripe_event_id", existing_type=sa.String(255), nullable=False)
        batch_op.drop_column("twilio_sid")
        batch_op.drop_column("source")
    op.drop_index("ix_sms_conversations_phone_created", table_name="sms_conversations")
    op.drop_index("ix_sms_conversations_phone", table_name="sms_conversations")
    op.drop_table("sms_conversations")
    op.drop_index("ix_message_templates_category", table_name="message_templates")
    op.drop_table("message_templates")
