"""
Seed demo/sample data into Railway production DB.
Creates 15 recurring attendees + realistic registrations across all 10 events.
Matches exactly with frontend demo-data.ts — same names, dietary, accommodation, statuses.

Run: DATABASE_URL="postgresql+asyncpg://..." python3 -m scripts.seed_demo
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from app.models.attendee import Attendee
from app.models.registration import Registration, RegistrationStatus

DB_URL = os.environ.get("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

# ── Event UUIDs (Railway production) ──────────────────────────────────────────
EVENT_IDS = {
    "e1": "388e41b4-ad94-40fd-9bf3-638debe2bad1",   # Intro to Loving Awareness (Zoom)
    "e2": "10e611dd-ffaa-477e-ba3f-4e90b9f0bad7",   # Emerging from Winter Retreat
    "e3": "dce081b7-5877-432d-9531-63cd776e77ab",   # Green Burial 101
    "e4": "10ee2eb4-329f-42c4-a537-7cd3436eb425",   # March Community Weekend
    "e5": "97ee719d-2dd3-47a9-8bc0-3a64c4491deb",   # Ram Dass Evenings — Satsang
    "e6": "23307dee-75da-40df-868e-4fbf54ef7e0c",   # March Forest Therapy
    "e7": "7a4fb765-2bca-4920-940d-ef6deb8020ae",   # Loving Awareness Retreat
    "e8": "a540cddd-a2f5-41d6-90da-e117802fd748",   # 5-Day Forest Sadhana
    "e9": "caa881f7-0b8a-4418-bd9e-a528a92cc404",   # Intimacy & Connection Retreat
}

# ── 15 Recurring Community Members ────────────────────────────────────────────
ATTENDEES = [
    {"key": "mara",    "first": "Mara",    "last": "Chen",        "email": "mara.chen@gmail.com",         "phone": "7705550101", "dietary": "Vegetarian"},
    {"key": "devon",   "first": "Devon",   "last": "Okafor",      "email": "devon.okafor@gmail.com",      "phone": "4045550102", "dietary": "Vegan"},
    {"key": "sage",    "first": "Sage",    "last": "Willowbrook", "email": "sage.willowbrook@icloud.com", "phone": "6785550103", "dietary": "Gluten-Free"},
    {"key": "river",   "first": "River",   "last": "Nakamura",    "email": "river.nakamura@gmail.com",    "phone": "7705550104", "dietary": None},
    {"key": "juniper", "first": "Juniper", "last": "Hayes",       "email": "juniper.hayes@gmail.com",     "phone": "4045550105", "dietary": "Vegetarian"},
    {"key": "aspen",   "first": "Aspen",   "last": "Torres",      "email": "aspen.torres@gmail.com",      "phone": "6785550106", "dietary": None},
    {"key": "indigo",  "first": "Indigo",  "last": "Park",        "email": "indigo.park@icloud.com",      "phone": "4045550107", "dietary": "Vegetarian"},
    {"key": "wren",    "first": "Wren",    "last": "Delacroix",   "email": "wren.delacroix@gmail.com",    "phone": "7705550108", "dietary": "Vegan"},
    {"key": "cedar",   "first": "Cedar",   "last": "Mbeki",       "email": "cedar.mbeki@gmail.com",       "phone": "4045550109", "dietary": "Gluten-Free"},
    {"key": "fern",    "first": "Fern",    "last": "Kowalski",    "email": "fern.kowalski@gmail.com",     "phone": "6785550110", "dietary": None},
    {"key": "sol",     "first": "Sol",     "last": "Reeves",      "email": "sol.reeves@gmail.com",        "phone": "4045550111", "dietary": None},
    {"key": "lark",    "first": "Lark",    "last": "Johansson",   "email": "lark.johansson@icloud.com",   "phone": "7705550112", "dietary": None},
    {"key": "willow",  "first": "Willow",  "last": "Tanaka",      "email": "willow.tanaka@gmail.com",     "phone": "4045550113", "dietary": "Vegan"},
    {"key": "rowan",   "first": "Rowan",   "last": "Baptiste",    "email": "rowan.baptiste@gmail.com",    "phone": "6785550114", "dietary": "Gluten-Free"},
    {"key": "sky",     "first": "Sky",     "last": "Petrov",      "email": "sky.petrov@gmail.com",        "phone": "4045550115", "dietary": None},
]

def ago(days=0, hours=0):
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)

def checkin(hour, minute=0):
    """2026-03-06 morning check-in timestamps"""
    return datetime(2026, 3, 6, hour, minute, 0, tzinfo=timezone.utc)

# ── Registration Data per Event ───────────────────────────────────────────────
# Fields: attendee_key, status, amount_cents, accom, dietary_override, checked_in_offset_h, created_days_ago
# dietary_override=None means use the attendee's default dietary
# checked_in_offset_h: hours after event start (None = not checked in)

REGISTRATIONS = {

    # e1: Intro to Loving Awareness (Zoom) — free, no accommodation
    "e1": [
        ("mara",    "complete",        0,    None, None, None, 21),
        ("devon",   "complete",        0,    None, None, None, 19),
        ("sage",    "complete",        0,    None, None, None, 17),
        ("river",   "complete",        0,    None, None, None, 16),
        ("fern",    "complete",        0,    None, None, None, 14),
        ("juniper", "complete",        0,    None, None, None, 12),
        ("willow",  "complete",        0,    None, None, None, 10),
        ("sky",     "complete",        0,    None, None, None, 8),
        ("wren",    "pending_payment", 0,    None, None, None, 5),
        ("cedar",   "pending_payment", 0,    None, None, None, 3),
        ("aspen",   "expired",         0,    None, None, None, 2),
    ],

    # e2: Emerging from Winter Retreat — past event, $125, everyone checked in
    "e2": [
        ("mara",    "complete", 12500, "bell_tent",   None, None, 28),
        ("devon",   "complete", 12500, "nylon_tent",  None, None, 27),
        ("sage",    "complete", 12500, "self_camping",None, None, 26),
        ("river",   "complete", 12500, "yurt_shared", None, None, 25),
        ("juniper", "complete", 12500, "bell_tent",   None, None, 24),
        ("indigo",  "complete", 12500, "nylon_tent",  None, None, 23),
        ("wren",    "complete", 12500, "self_camping",None, None, 22),
        ("fern",    "complete", 12500, "none",        None, None, 20),
        ("lark",    "complete", 12500, "yurt_shared", None, None, 18),
        ("willow",  "complete", 12500, "bell_tent",   None, None, 17),
        ("aspen",   "expired",      0, "bell_tent",   None, None, 15),
        ("sol",     "pending_payment", 0, "nylon_tent",None,None, 4),
    ],

    # e3: Green Burial 101 (Zoom) — free
    "e3": [
        ("river",   "complete",        0, None, None, None, 18),
        ("sage",    "complete",        0, None, None, None, 16),
        ("lark",    "complete",        0, None, None, None, 14),
        ("sol",     "complete",        0, None, None, None, 13),
        ("sky",     "complete",        0, None, None, None, 11),
        ("rowan",   "complete",        0, None, None, None, 10),
        ("cedar",   "complete",        0, None, None, None, 8),
        ("wren",    "pending_payment", 0, None, None, None, 4),
    ],

    # e4: March Community Weekend — flagship demo, $50, mix of statuses + check-ins
    "e4": [
        ("mara",    "complete",        5000, "bell_tent",   None,          1, 14),  # checked in 1h after start
        ("devon",   "complete",        5000, "nylon_tent",  None,          None, 13),
        ("sage",    "complete",        5000, "self_camping","Gluten-Free", None, 12),
        ("river",   "complete",        5000, "yurt_shared", None,          2, 11),
        ("juniper", "complete",        5000, "bell_tent",   "Vegetarian",  None, 10),
        ("aspen",   "expired",            0, "nylon_tent",  None,          None, 9),
        ("indigo",  "complete",        5000, "nylon_tent",  "Vegetarian",  3, 8),
        ("wren",    "pending_payment",    0, "self_camping","Vegan",       None, 7),
        ("cedar",   "pending_payment",    0, "yurt_shared", "Gluten-Free", None, 6),
        ("fern",    "complete",        5000, "none",        None,          4, 5),
        ("sol",     "complete",        5000, "bell_tent",   None,          None, 4),
        ("lark",    "complete",        5000, "yurt_shared", None,          5, 3),
        ("willow",  "complete",        5000, "bell_tent",   "Vegan",       None, 2),
        ("rowan",   "pending_payment",    0, "nylon_tent",  "Gluten-Free", None, 1),
        ("sky",     "complete",        5000, "self_camping",None,          None, 0),
    ],

    # e5: Ram Dass Evenings — Satsang, donation ~$30-60, evening check-ins, no accom
    "e5": [
        ("mara",    "complete",  4500, None, "Vegetarian", 0,    12),
        ("river",   "complete",  6000, None, None,         -1,   11),  # arrived early
        ("sage",    "complete",  3000, None, "Gluten-Free", 1,   10),
        ("devon",   "complete",  4500, None, "Vegan",      None, 9),
        ("fern",    "complete",     0, None, None,          0,   8),   # dana (free)
        ("indigo",  "complete",  5000, None, "Vegetarian", None, 7),
        ("wren",    "pending_payment", 0, None, "Vegan",   None, 6),
        ("cedar",   "expired",      0, None, None,         None, 5),
        ("sky",     "complete",  4000, None, None,          1,   4),
        ("lark",    "complete",  3500, None, None,         None, 3),
        ("rowan",   "pending_payment", 0, None, "Gluten-Free", None, 2),
    ],

    # e6: March Forest Therapy — Shinrin Yoku, $125, small group, morning check-ins
    "e6": [
        ("juniper", "complete", 12500, "none",        "Vegetarian", 0,    10),
        ("mara",    "complete", 12500, "none",        "Vegetarian", 1,    9),
        ("devon",   "complete", 12500, "self_camping","Vegan",      None, 8),
        ("river",   "complete", 12500, "none",        None,          2,   7),
        ("aspen",   "complete", 12500, "none",        None,         None, 6),
        ("willow",  "pending_payment", 0, "nylon_tent","Vegan",     None, 5),
        ("cedar",   "pending_payment", 0, "none",     "Gluten-Free",None, 4),
        ("sky",     "complete", 12500, "none",        None,         None, 3),
        ("sol",     "complete", 12500, "nylon_tent",  None,         None, 2),
        ("rowan",   "expired",      0, "none",        "Gluten-Free",None, 1),
    ],

    # e7: Loving Awareness Retreat — $250, biggest upcoming event
    "e7": [
        ("mara",    "complete", 25000, "bell_tent",   "Vegetarian",  None, 42),
        ("devon",   "complete", 25000, "nylon_tent",  "Vegan",       None, 40),
        ("sage",    "complete", 25000, "self_camping","Gluten-Free", None, 38),
        ("river",   "complete", 25000, "yurt_shared", None,          None, 36),
        ("juniper", "complete", 25000, "bell_tent",   "Vegetarian",  None, 35),
        ("aspen",   "complete", 25000, "nylon_tent",  None,          None, 33),
        ("indigo",  "complete", 25000, "bell_tent",   "Vegetarian",  None, 31),
        ("fern",    "complete", 25000, "yurt_shared", None,          None, 28),
        ("lark",    "complete", 25000, "yurt_shared", None,          None, 25),
        ("willow",  "complete", 25000, "bell_tent",   "Vegan",       None, 22),
        ("sol",     "complete", 25000, "nylon_tent",  None,          None, 20),
        ("sky",     "complete", 25000, "self_camping",None,          None, 18),
        ("wren",    "pending_payment", 0, "nylon_tent","Vegan",      None, 10),
        ("cedar",   "pending_payment", 0, "yurt_shared","Gluten-Free",None, 8),
        ("rowan",   "pending_payment", 0, "self_camping","Gluten-Free",None,5),
    ],

    # e8: 5-Day Forest Sadhana — $450, premium retreat
    "e8": [
        ("mara",    "complete", 45000, "bell_tent",   "Vegetarian",  None, 50),
        ("devon",   "complete", 45000, "bell_tent",   "Vegan",       None, 48),
        ("river",   "complete", 45000, "yurt_shared", None,          None, 45),
        ("juniper", "complete", 45000, "bell_tent",   "Vegetarian",  None, 42),
        ("indigo",  "complete", 45000, "nylon_tent",  "Vegetarian",  None, 40),
        ("lark",    "complete", 45000, "yurt_shared", None,          None, 38),
        ("willow",  "complete", 45000, "bell_tent",   "Vegan",       None, 35),
        ("sol",     "complete", 45000, "nylon_tent",  None,          None, 33),
        ("sky",     "complete", 45000, "self_camping",None,          None, 30),
        ("wren",    "pending_payment", 0, "bell_tent","Vegan",       None, 15),
        ("cedar",   "pending_payment", 0, "yurt_shared","Gluten-Free",None,10),
        ("rowan",   "expired",      0, "nylon_tent",  "Gluten-Free", None, 5),
    ],

    # e9: Intimacy & Connection Retreat — $275
    "e9": [
        ("mara",    "complete", 27500, "bell_tent",   "Vegetarian",  None, 55),
        ("sage",    "complete", 27500, "self_camping","Gluten-Free", None, 52),
        ("river",   "complete", 27500, "yurt_shared", None,          None, 50),
        ("aspen",   "complete", 27500, "nylon_tent",  None,          None, 48),
        ("indigo",  "complete", 27500, "bell_tent",   "Vegetarian",  None, 45),
        ("fern",    "complete", 27500, "none",        None,          None, 42),
        ("lark",    "complete", 27500, "yurt_shared", None,          None, 40),
        ("willow",  "complete", 27500, "bell_tent",   "Vegan",       None, 38),
        ("sol",     "complete", 27500, "nylon_tent",  None,          None, 35),
        ("sky",     "complete", 27500, "self_camping",None,          None, 32),
        ("wren",    "pending_payment", 0, "bell_tent","Vegan",       None, 20),
        ("cedar",   "pending_payment", 0, "yurt_shared","Gluten-Free",None,15),
        ("rowan",   "pending_payment", 0, "none",     "Gluten-Free", None, 10),
        ("devon",   "expired",      0, "nylon_tent",  "Vegan",       None, 5),
        ("juniper", "expired",      0, "bell_tent",   "Vegetarian",  None, 3),
    ],
}

# ── Event start times for check-in calculations ───────────────────────────────
EVENT_STARTS = {
    "e1": datetime(2026, 2, 19, 19, 0, tzinfo=timezone.utc),
    "e2": datetime(2026, 2, 21, 14, 0, tzinfo=timezone.utc),
    "e3": datetime(2026, 2, 22, 14, 0, tzinfo=timezone.utc),
    "e4": datetime(2026, 3, 6, 16, 0, tzinfo=timezone.utc),
    "e5": datetime(2026, 3, 6, 18, 0, tzinfo=timezone.utc),
    "e6": datetime(2026, 3, 8, 10, 0, tzinfo=timezone.utc),
    "e7": datetime(2026, 3, 20, 14, 0, tzinfo=timezone.utc),
    "e8": datetime(2026, 3, 22, 10, 0, tzinfo=timezone.utc),
    "e9": datetime(2026, 4, 24, 14, 0, tzinfo=timezone.utc),
}


async def seed_demo():
    engine = create_async_engine(DB_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Step 1: Create/upsert all 15 attendees
        att_ids = {}
        for a in ATTENDEES:
            result = await session.execute(select(Attendee).where(Attendee.email == a["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  ⏭️  Attendee exists: {a['first']} {a['last']}")
                att_ids[a["key"]] = existing.id
            else:
                new_att = Attendee(
                    id=uuid.uuid4(),
                    email=a["email"],
                    first_name=a["first"],
                    last_name=a["last"],
                    phone=a.get("phone"),
                )
                session.add(new_att)
                await session.flush()
                att_ids[a["key"]] = new_att.id
                print(f"  ✅ Created attendee: {a['first']} {a['last']}")

        await session.commit()

        # Build attendee key → dietary lookup
        att_dietary = {a["key"]: a["dietary"] for a in ATTENDEES}

        # Step 2: Create registrations per event
        total_created = 0
        total_skipped = 0
        for event_key, regs in REGISTRATIONS.items():
            event_uuid = EVENT_IDS.get(event_key)
            if not event_uuid:
                continue
            event_start = EVENT_STARTS.get(event_key)
            print(f"\n  📅 Event {event_key}:")

            for (att_key, status, amount, accom, dietary_override, checkin_hours, created_days) in regs:
                att_id = att_ids.get(att_key)
                if not att_id:
                    print(f"    ⚠️  No attendee ID for {att_key}")
                    continue

                # Check if registration already exists
                result = await session.execute(
                    select(Registration).where(
                        Registration.attendee_id == att_id,
                        Registration.event_id == uuid.UUID(event_uuid)
                    )
                )
                if result.scalar_one_or_none():
                    total_skipped += 1
                    continue

                # Determine check-in time
                checked_in_at = None
                if checkin_hours is not None and status == "complete" and event_start:
                    checked_in_at = event_start + timedelta(hours=checkin_hours + 0.75)

                dietary = dietary_override if dietary_override is not None else att_dietary.get(att_key)

                reg = Registration(
                    id=uuid.uuid4(),
                    attendee_id=att_id,
                    event_id=uuid.UUID(event_uuid),
                    status=RegistrationStatus(status),
                    payment_amount_cents=amount if status == "complete" else 0,
                    accommodation_type=accom or "none",
                    dietary_restrictions=dietary,
                    intake_data={
                        "experience": ["Beginner", "Returning", "Regular"][hash(att_key) % 3],
                        "how_heard": ["Instagram", "Friend referral", "Newsletter", "Website", "Returning attendee"][hash(att_key + event_key) % 5],
                        "emergency_contact": f"{att_key.capitalize()} Emergency, 555-{900 + hash(att_key) % 100:04d}",
                    },
                    waiver_accepted_at=ago(days=created_days) if status != "expired" else None,
                    source="registration_form",
                    created_at=ago(days=created_days, hours=2),
                    updated_at=ago(days=max(0, created_days - 1)),
                    checked_in_at=checked_in_at,
                    checked_in_by="brian@justloveforest.com" if checked_in_at else None,
                )
                session.add(reg)
                total_created += 1
                status_icon = {"complete": "✓", "pending_payment": "⏳", "expired": "✗", "cancelled": "—"}.get(status, "?")
                name = next(a["first"] + " " + a["last"] for a in ATTENDEES if a["key"] == att_key)
                print(f"    {status_icon} {name:<22} {status:<18} ${amount/100:>6.2f}  {accom or 'no accom'}")

        await session.commit()
        print(f"\n🌲 Demo seed complete! Created {total_created} registrations, skipped {total_skipped} existing.")


if __name__ == "__main__":
    asyncio.run(seed_demo())
