"""Import clients from JLF_Client_List.csv into the attendees table.

Usage:
    cd src/backend
    python -m scripts.import_clients

Idempotent: safe to run multiple times. Matches on email (case-insensitive).
"""

import asyncio
import csv
import logging
import re
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import async_session  # noqa: E402
from app.models.attendee import Attendee  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

CSV_PATH = Path(__file__).resolve().parent.parent.parent.parent / "reference" / "JLF_Client_List.csv"

# Known test/junk entries to skip (by email or pattern)
SKIP_EMAILS = {
    "blah@gmail.com",
    "p@gmail.com",
    "jane.mctest@example.com",
}

# Emails belonging to test accounts from Nivay/Bala
TEST_NAME_PATTERNS = re.compile(
    r"^(test|nivay test|nivay \d|832|835|847|908|nivay 7\d{2}|bala bala|bala test|"
    r"test2|test 3|nivay 720|nivay 759|nivay 804|nivay 704pm|nivay 729|guests|"
    r"dre service|quiana brownlee)$",
    re.IGNORECASE,
)


def normalize_phone(raw: str) -> str | None:
    """Normalize a phone number to E.164 format (+1XXXXXXXXXX) or return None."""
    if not raw:
        return None
    # Strip quotes, apostrophes, parens, dashes, spaces
    cleaned = re.sub(r"['\"\s()\-\.]", "", raw)
    # Remove leading + for processing
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
    # Must be digits only now
    if not cleaned.isdigit():
        return None
    # Handle 10-digit US numbers
    if len(cleaned) == 10:
        return f"+1{cleaned}"
    # Handle 11-digit with leading 1
    if len(cleaned) == 11 and cleaned.startswith("1"):
        return f"+{cleaned}"
    # Handle international (already has country code)
    if len(cleaned) >= 10:
        return f"+{cleaned}"
    return None


def is_test_entry(first_name: str, last_name: str, email: str) -> bool:
    """Check if this is a test/junk entry that should be skipped."""
    if email.lower() in SKIP_EMAILS:
        return True
    full = f"{first_name} {last_name}".strip()
    if TEST_NAME_PATTERNS.match(full):
        return True
    if TEST_NAME_PATTERNS.match(first_name):
        return True
    return False


def parse_rows(csv_path: Path) -> list[dict]:
    """Parse CSV and return cleaned attendee dicts.

    Handles special cases:
    - Row 2: "Mira Joleigh" + "& Alex Himes" → two attendees
    - Row 3: "Nivay 211" + "743" → Naveed with known phone
    - Multi-email rows: take first email only
    - Duplicate emails: first occurrence wins
    """
    rows = []
    seen_emails: set[str] = set()

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):  # row 2 is first data row
            first_name = row.get("First Name", "").strip()
            last_name = row.get("Last Name", "").strip()
            phone_raw = row.get("Phone", "").strip()
            email_raw = row.get("Email", "").strip()

            # Skip empty rows
            if not email_raw:
                continue

            # Take first email if comma-separated
            email = email_raw.split(",")[0].strip().lower()
            if not email or "@" not in email:
                continue

            # Special case: Row 2 — "Mira Joleigh" + "& Alex Himes"
            if i == 2 and first_name == "Mira Joleigh" and last_name.startswith("& Alex"):
                phone = normalize_phone(phone_raw)
                if email not in seen_emails:
                    rows.append({
                        "first_name": "Mira Joleigh",
                        "last_name": "Himes",
                        "email": email,
                        "phone": phone,
                    })
                    seen_emails.add(email)
                # Alex gets his own known email from row 258
                continue

            # Special case: Row 3 — "Nivay 211" + "743" → Naveed Nawabi
            if i == 3 and "nivay" in first_name.lower() and last_name in ("743", ""):
                email = "nivay@justloveforest.com"
                if email not in seen_emails:
                    rows.append({
                        "first_name": "Naveed",
                        "last_name": "Nawabi",
                        "email": email,
                        "phone": "+16789778983",
                    })
                    seen_emails.add(email)
                continue

            # Skip test entries
            if is_test_entry(first_name, last_name, email):
                continue

            # Skip duplicates (keep first occurrence)
            if email in seen_emails:
                continue
            seen_emails.add(email)

            # Clean up names with quotes/nicknames
            first_name = re.sub(r'["""]', '', first_name).strip()
            # Handle "First & Second" patterns — keep as-is (they registered together)

            phone = normalize_phone(phone_raw)

            rows.append({
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
            })

    return rows


async def import_clients(session: AsyncSession) -> dict:
    """Import clients into the attendees table. Returns summary."""
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    clients = parse_rows(CSV_PATH)
    logger.info("Parsed %d unique client records from CSV", len(clients))

    created = 0
    updated = 0
    skipped = 0
    errors = 0

    for client in clients:
        try:
            result = await session.execute(
                select(Attendee).where(Attendee.email == client["email"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update name/phone if previously blank
                changed = False
                if not existing.phone and client["phone"]:
                    existing.phone = client["phone"]
                    changed = True
                if changed:
                    updated += 1
                else:
                    skipped += 1
            else:
                attendee = Attendee(
                    first_name=client["first_name"],
                    last_name=client["last_name"],
                    email=client["email"],
                    phone=client["phone"],
                )
                session.add(attendee)
                created += 1
        except Exception as e:
            logger.error("Error processing %s: %s", client["email"], e)
            errors += 1

    await session.commit()

    summary = {
        "total_parsed": len(clients),
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
    return summary


async def main():
    async with async_session() as session:
        summary = await import_clients(session)
        logger.info("Import complete: %s", summary)


if __name__ == "__main__":
    asyncio.run(main())
