"""Seed the database with real JLF events and an admin user."""

import asyncio
import sys
from datetime import datetime, time, timezone
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings
from app.database import async_session
from app.models.attendee import Attendee
from app.models.co_creator import CoCreator, EventCoCreator
from app.models.event import Event, EventStatus, PricingModel
from app.models.registration import (
    AccommodationType,
    Registration,
    RegistrationSource,
    RegistrationStatus,
)
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

# ---------------------------------------------------------------------------
# Admin user
# ---------------------------------------------------------------------------
ADMINS = [
    {
        "email": "brandon.abbott96@gmail.com",
        "name": "Brandon Abbott",
        "role": UserRole.admin,
        "password": "jlf-admin-2026",  # Change in production
    },
    {
        "email": "brian@justloveforest.com",
        "name": "Brian Y.",
        "role": UserRole.admin,
        "password": "jlf-admin-2026",  # Change in production
    },
]

# ---------------------------------------------------------------------------
# Real JLF events (mirrors frontend demo data)
# ---------------------------------------------------------------------------
EVENTS = [
    {
        "name": "Intro to Loving Awareness (Zoom)",
        "slug": "loving-awareness-zoom",
        "description": "A free virtual introduction to loving awareness practice, inspired by Ram Dass teachings. Open to all levels.",
        "event_date": datetime(2026, 2, 19, 19, 0, tzinfo=timezone.utc),
        "event_type": "Ashram",
        "pricing_model": PricingModel.free,
        "capacity": 100,
        "meeting_point_a": "Zoom (link emailed after registration)",
        "status": EventStatus.active,
    },
    {
        "name": "Emerging from Winter Retreat",
        "slug": "emerging-winter",
        "description": "A transformative weekend retreat to shed the winter layers and step into spring with intention. Includes guided meditation, forest bathing, communal meals, and fire ceremony.",
        "event_date": datetime(2026, 2, 21, 14, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 2, 22, 16, 0, tzinfo=timezone.utc),
        "event_type": "Retreats",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 12500,
        "capacity": 30,
        "meeting_point_a": "Heated Yurt — Basecamp",
        "meeting_point_b": "Stargazing Meadow",
        "day_of_sms_time": time(8, 0),
        "status": EventStatus.active,
    },
    {
        "name": "Green Burial 101 Virtual Tour",
        "slug": "green-burial-101",
        "description": "Learn about natural burial practices and tour the Just Love Forest conservation burial ground virtually. Free event.",
        "event_date": datetime(2026, 2, 22, 14, 0, tzinfo=timezone.utc),
        "event_type": "Green Burial",
        "pricing_model": PricingModel.free,
        "capacity": 50,
        "meeting_point_a": "Zoom (link emailed after registration)",
        "status": EventStatus.active,
    },
    {
        "name": "March Community Weekend",
        "slug": "march-community",
        "description": "An open community gathering at the forest — potluck, music, bonfire, and connection. Family friendly.",
        "event_date": datetime(2026, 3, 6, 16, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 3, 8, 12, 0, tzinfo=timezone.utc),
        "event_type": "Community Weekend",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 5000,
        "capacity": 50,
        "meeting_point_a": "Basecamp Welcome Circle",
        "meeting_point_b": "Fire Circle",
        "day_of_sms_time": time(9, 0),
        "status": EventStatus.active,
    },
    {
        "name": "Ram Dass Evenings — Satsang",
        "slug": "satsang-march",
        "description": "An evening of kirtan, meditation, and dharma talk in the tradition of Ram Dass. Donation-based.",
        "event_date": datetime(2026, 3, 6, 18, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 3, 7, 10, 0, tzinfo=timezone.utc),
        "event_type": "Meditation",
        "pricing_model": PricingModel.donation,
        "min_donation_cents": 2500,
        "capacity": 40,
        "meeting_point_a": "Meditation Yurt",
        "status": EventStatus.active,
    },
    {
        "name": "March Forest Therapy — Shinrin Yoku",
        "slug": "forest-therapy-march",
        "description": "A guided forest bathing experience rooted in the Japanese practice of Shinrin Yoku. Includes rose tea ceremony and nature meditation.",
        "event_date": datetime(2026, 3, 8, 10, 0, tzinfo=timezone.utc),
        "event_type": "Forest Therapy",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 12500,
        "capacity": 20,
        "meeting_point_a": "Yurt — Rose Tea Ceremony",
        "meeting_point_b": "Forest Trailhead",
        "day_of_sms_time": time(7, 30),
        "status": EventStatus.active,
    },
    {
        "name": "Loving Awareness Retreat w/ Sitaram Dass",
        "slug": "loving-awareness-retreat",
        "description": "A 3-day immersive retreat led by Sitaram Dass exploring loving awareness, bhakti yoga, and heart-centered meditation.",
        "event_date": datetime(2026, 3, 20, 14, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 3, 22, 12, 0, tzinfo=timezone.utc),
        "event_type": "Retreats",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 25000,
        "capacity": 40,
        "meeting_point_a": "Ashram Main Gathering",
        "meeting_point_b": "Bhakti Mountain Trail",
        "day_of_sms_time": time(8, 0),
        "status": EventStatus.active,
    },
    {
        "name": "5-Day Forest Sadhana w/ Sitaram Dass",
        "slug": "forest-sadhana",
        "description": "A deep 5-day sadhana (spiritual practice) combining forest immersion, meditation, yoga, and devotional practice. Led by Sitaram Dass.",
        "event_date": datetime(2026, 3, 22, 10, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 3, 27, 12, 0, tzinfo=timezone.utc),
        "event_type": "Retreats",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 45000,
        "capacity": 25,
        "meeting_point_a": "Ashram Main Gathering",
        "meeting_point_b": "Bhakti Mountain Summit",
        "day_of_sms_time": time(7, 0),
        "status": EventStatus.active,
    },
    {
        "name": "Intimacy & Connection Retreat",
        "slug": "intimacy-connection",
        "description": "A weekend exploring authentic relating, embodied connection, and intimacy practices in a safe, nature-held container.",
        "event_date": datetime(2026, 4, 24, 14, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
        "event_type": "Retreats",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 27500,
        "capacity": 30,
        "meeting_point_a": "Welcome Circle — Basecamp",
        "day_of_sms_time": time(8, 30),
        "status": EventStatus.active,
    },
    {
        "name": "GAY by NATURE Retreat",
        "slug": "gay-by-nature",
        "description": "A celebration of queer identity in nature — community, ceremony, and connection for LGBTQ+ folks. Coming soon.",
        "event_date": datetime(2026, 5, 28, 14, 0, tzinfo=timezone.utc),
        "event_end_date": datetime(2026, 5, 31, 12, 0, tzinfo=timezone.utc),
        "event_type": "Retreats",
        "pricing_model": PricingModel.fixed,
        "fixed_price_cents": 30000,
        "capacity": 30,
        "meeting_point_a": "Basecamp Welcome",
        "meeting_point_b": "Fire Circle",
        "status": EventStatus.draft,
    },
]

# ---------------------------------------------------------------------------
# Co-creators
# ---------------------------------------------------------------------------
CO_CREATORS = [
    {"name": "Sitaram Dass", "email": "sitaram@sacredcommunityproject.org"},
    {"name": "Christina Della Iacono", "email": "christina@justloveforest.com"},
    {"name": "Naveed N.", "email": "naveed@justloveforest.com"},
]

# Co-creator → event slug assignments
CO_CREATOR_EVENTS = {
    "sitaram@sacredcommunityproject.org": [
        "loving-awareness-retreat",
        "forest-sadhana",
    ],
    "christina@justloveforest.com": ["intimacy-connection"],
    "naveed@justloveforest.com": ["march-community", "forest-therapy-march"],
}

# ---------------------------------------------------------------------------
# Sample attendees + registrations for "Emerging from Winter" to populate dashboard
# ---------------------------------------------------------------------------
SAMPLE_NAMES = [
    ("Mara", "Chen"), ("Devon", "Okafor"), ("Sage", "Willowbrook"),
    ("River", "Nakamura"), ("Juniper", "Hayes"), ("Aspen", "Torres"),
    ("Indigo", "Park"), ("Wren", "Delacroix"), ("Cedar", "Mbeki"),
    ("Fern", "Kowalski"), ("Sol", "Reeves"), ("Lark", "Johansson"),
    ("Willow", "Tanaka"), ("Rowan", "Baptiste"),
]

ACCOMMODATIONS = [
    AccommodationType.bell_tent,
    AccommodationType.nylon_tent,
    AccommodationType.self_camping,
    AccommodationType.yurt_shared,
    AccommodationType.none,
]

DIETS = [
    "Vegetarian", "Vegan", "Gluten-free", None, None, None,
]


async def seed():
    async with async_session() as db:
        # --- Admin users ---
        from sqlalchemy import select

        for admin_data in ADMINS:
            existing_user = await db.execute(
                select(User).where(User.email == admin_data["email"])
            )
            if not existing_user.scalar_one_or_none():
                user = User(
                    email=admin_data["email"],
                    name=admin_data["name"],
                    role=admin_data["role"],
                    password_hash=hash_password(admin_data["password"]),
                )
                db.add(user)
                print(f"✅ Created admin user: {admin_data['email']}")
            else:
                print(f"⏭️  Admin user already exists: {admin_data['email']}")

        # --- Events ---
        event_map = {}  # slug → Event object
        for ev_data in EVENTS:
            existing_event = await db.execute(
                select(Event).where(Event.slug == ev_data["slug"])
            )
            if not existing_event.scalar_one_or_none():
                event = Event(**ev_data)
                db.add(event)
                await db.flush()
                event_map[event.slug] = event
                print(f"✅ Created event: {event.name}")
            else:
                event = (
                    await db.execute(
                        select(Event).where(Event.slug == ev_data["slug"])
                    )
                ).scalar_one()
                event_map[event.slug] = event
                print(f"⏭️  Event already exists: {ev_data['name']}")

        # --- Co-creators ---
        cc_map = {}  # email → CoCreator
        for cc_data in CO_CREATORS:
            existing_cc = await db.execute(
                select(CoCreator).where(CoCreator.email == cc_data["email"])
            )
            if not existing_cc.scalar_one_or_none():
                cc = CoCreator(**cc_data)
                db.add(cc)
                await db.flush()
                cc_map[cc.email] = cc
                print(f"✅ Created co-creator: {cc.name}")
            else:
                cc = (
                    await db.execute(
                        select(CoCreator).where(CoCreator.email == cc_data["email"])
                    )
                ).scalar_one()
                cc_map[cc.email] = cc
                print(f"⏭️  Co-creator already exists: {cc_data['name']}")

        # --- Event <-> Co-creator links ---
        for cc_email, event_slugs in CO_CREATOR_EVENTS.items():
            cc = cc_map.get(cc_email)
            if not cc:
                continue
            for slug in event_slugs:
                event = event_map.get(slug)
                if not event:
                    continue
                existing_link = await db.execute(
                    select(EventCoCreator).where(
                        EventCoCreator.event_id == event.id,
                        EventCoCreator.co_creator_id == cc.id,
                    )
                )
                if not existing_link.scalar_one_or_none():
                    link = EventCoCreator(
                        event_id=event.id,
                        co_creator_id=cc.id,
                        can_see_amounts=True,
                    )
                    db.add(link)
                    print(f"  🔗 Linked {cc.name} → {event.name}")

        # --- Sample registrations for Emerging from Winter ---
        emerging = event_map.get("emerging-winter")
        if emerging:
            for i, (first, last) in enumerate(SAMPLE_NAMES):
                email = f"{first.lower()}.{last.lower()}@example.com"
                existing_att = await db.execute(
                    select(Attendee).where(Attendee.email == email)
                )
                if existing_att.scalar_one_or_none():
                    continue

                attendee = Attendee(
                    email=email,
                    first_name=first,
                    last_name=last,
                    phone=f"+1-555-{100 + i:04d}",
                )
                db.add(attendee)
                await db.flush()

                # Mix of statuses
                if i < 10:
                    status = RegistrationStatus.complete
                elif i < 12:
                    status = RegistrationStatus.pending_payment
                else:
                    status = RegistrationStatus.expired

                reg = Registration(
                    attendee_id=attendee.id,
                    event_id=emerging.id,
                    status=status,
                    payment_amount_cents=emerging.fixed_price_cents if status == RegistrationStatus.complete else None,
                    accommodation_type=ACCOMMODATIONS[i % len(ACCOMMODATIONS)],
                    dietary_restrictions=DIETS[i % len(DIETS)],
                    intake_data={
                        "experience": ["Beginner", "Intermediate", "Advanced"][i % 3],
                        "emergency_contact": f"Emergency Contact {i}, 555-{200 + i:04d}",
                        "how_heard": ["Instagram", "Friend referral", "Website", "Newsletter", "Returning attendee"][i % 5],
                    },
                    source=RegistrationSource.registration_form,
                    waiver_accepted_at=datetime.now(timezone.utc) if status == RegistrationStatus.complete else None,
                )
                db.add(reg)
                print(f"  👤 Registered {first} {last} ({status.value})")

        await db.commit()
        print("\n🌲 Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
