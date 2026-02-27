"""Event-based reminder tasks.

Payment-chase reminders (pending_payment auto-expire, escalation emails) were
removed in v4 per ADR-016. PENDING_PAYMENT is now transient (seconds during
Stripe redirect) — no timer/reminder logic needed.

This module retains only event-based reminders (1 week, 1 day before event),
which are not yet implemented.
"""
import logging

logger = logging.getLogger(__name__)
