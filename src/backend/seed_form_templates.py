"""Seed script: create 6 default form templates for JLF events.

Run from the src/backend directory:
    python seed_form_templates.py

Templates created:
  1. Accommodation Selection        (accommodation)
  2. Dietary Considerations         (dietary)
  3. Travel & Logistics             (travel)
  4. Health & Safety Disclosure     (health)
  5. First Timer & General          (logistics)
  6. Community Well-being & Waiver  (waiver)
"""
import asyncio
import sys
from pathlib import Path

# Ensure the src/backend directory is on sys.path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select

from app.database import async_session
from app.models.form_template import FormTemplate, FormType

DEFAULT_TEMPLATES = [
    {
        "name": "Accommodation Selection",
        "description": "Captures overnight accommodation preferences including sleeping arrangement and mattress size.",
        "form_type": FormType.accommodation,
        "is_default": True,
        "fields": [
            {
                "id": "accommodation_type",
                "type": "dropdown",
                "label": "Accommodation preference",
                "options": [
                    "Bell tent (provided)",
                    "Tipi twin (shared)",
                    "Self-camping (bring your own gear)",
                    "Day only (not staying overnight)",
                    "No accommodation needed",
                ],
                "required": True,
                "placeholder": None,
                "help_text": "Select how you'll be staying at the event.",
            },
            {
                "id": "mattress_preference",
                "type": "dropdown",
                "label": "Mattress size preference (bell tent / tipi)",
                "options": ["Single / twin", "Double / full", "No preference"],
                "required": False,
                "placeholder": None,
                "help_text": "Only applies if staying in a bell tent or tipi.",
            },
            {
                "id": "self_camping_notes",
                "type": "textarea",
                "label": "Self-camping details",
                "required": False,
                "placeholder": "e.g., bringing a van, large dome tent, etc.",
                "help_text": "Any details about your camping setup we should know.",
            },
        ],
    },
    {
        "name": "Dietary Considerations & Allergies",
        "description": "Collects dietary restrictions, food allergies, and medical dietary needs to inform meal planning.",
        "form_type": FormType.dietary,
        "is_default": True,
        "fields": [
            {
                "id": "diet_type",
                "type": "dropdown",
                "label": "Primary dietary preference",
                "options": [
                    "No restrictions",
                    "Vegetarian",
                    "Vegan",
                    "Gluten-free",
                    "Dairy-free",
                    "Vegan + gluten-free",
                    "Other (describe below)",
                ],
                "required": True,
                "placeholder": None,
                "help_text": None,
            },
            {
                "id": "allergies",
                "type": "textarea",
                "label": "Food allergies or sensitivities",
                "required": False,
                "placeholder": "e.g., tree nuts, shellfish, soy, sesame...",
                "help_text": "List any allergies we must avoid when preparing food.",
            },
            {
                "id": "medical_dietary",
                "type": "textarea",
                "label": "Medical dietary requirements",
                "required": False,
                "placeholder": "e.g., diabetic diet, low-sodium, etc.",
                "help_text": "Any medically necessary dietary requirements not covered above.",
            },
        ],
    },
    {
        "name": "Travel & Logistics",
        "description": "Captures arrival/departure plans and carpooling preferences.",
        "form_type": FormType.travel,
        "is_default": False,
        "fields": [
            {
                "id": "arrival_time",
                "type": "text",
                "label": "Estimated arrival time",
                "required": False,
                "placeholder": "e.g., Friday at 5pm",
                "help_text": "Helps us prepare for your arrival.",
            },
            {
                "id": "departure_time",
                "type": "text",
                "label": "Estimated departure time",
                "required": False,
                "placeholder": "e.g., Sunday at noon",
                "help_text": None,
            },
            {
                "id": "carpooling",
                "type": "dropdown",
                "label": "Carpooling",
                "options": [
                    "Driving — can offer rides",
                    "Need a ride",
                    "Driving alone / not interested in carpool",
                ],
                "required": False,
                "placeholder": None,
                "help_text": "We'll connect drivers and riders via the community channel.",
            },
            {
                "id": "vehicle_type",
                "type": "text",
                "label": "Vehicle type (if offering rides)",
                "required": False,
                "placeholder": "e.g., Sedan — 3 seats available",
                "help_text": "Only needed if you selected 'can offer rides' above.",
            },
        ],
    },
    {
        "name": "Health & Safety Disclosure",
        "description": "Collects relevant health information and confirms understanding of safety practices at the event.",
        "form_type": FormType.health,
        "is_default": False,
        "fields": [
            {
                "id": "health_conditions",
                "type": "textarea",
                "label": "Health conditions we should know about",
                "required": False,
                "placeholder": "e.g., heart condition, mobility limitations, chronic pain...",
                "help_text": "This information is confidential and shared only with facilitators.",
            },
            {
                "id": "safety_understanding",
                "type": "checkbox",
                "label": "I understand the physical and emotional nature of this gathering and take responsibility for my own wellbeing.",
                "required": True,
                "placeholder": None,
                "help_text": None,
            },
            {
                "id": "emergency_contact_name",
                "type": "text",
                "label": "Emergency contact name",
                "required": False,
                "placeholder": "Full name",
                "help_text": None,
            },
            {
                "id": "emergency_contact_phone",
                "type": "text",
                "label": "Emergency contact phone",
                "required": False,
                "placeholder": "+1 (404) 555-0123",
                "help_text": None,
            },
        ],
    },
    {
        "name": "First Timer & General",
        "description": "Gathers general information — first-time attendee status, how they heard about JLF, and any questions.",
        "form_type": FormType.logistics,
        "is_default": False,
        "fields": [
            {
                "id": "first_time",
                "type": "radio",
                "label": "Is this your first time at Just Love Forest?",
                "options": ["Yes, first time!", "No, I've been before"],
                "required": True,
                "placeholder": None,
                "help_text": None,
            },
            {
                "id": "how_heard",
                "type": "textarea",
                "label": "How did you hear about us?",
                "required": False,
                "placeholder": "e.g., friend referral, Instagram, Meetup, Google...",
                "help_text": None,
            },
            {
                "id": "questions",
                "type": "textarea",
                "label": "Any questions or things you'd like us to know?",
                "required": False,
                "placeholder": "Anything on your mind...",
                "help_text": None,
            },
        ],
    },
    {
        "name": "Community Well-being & Waiver",
        "description": "Community guidelines agreement and liability waiver. Requires explicit acceptance.",
        "form_type": FormType.waiver,
        "is_default": True,
        "fields": [
            {
                "id": "community_guidelines",
                "type": "checkbox",
                "label": "I agree to uphold the Just Love Forest community guidelines: respectful communication, conscious use of substances (sobriety respected), care for the land, and support for all attendees.",
                "required": True,
                "placeholder": None,
                "help_text": None,
            },
            {
                "id": "liability_waiver",
                "type": "checkbox",
                "label": "I understand and accept that Just Love Forest LLC is not liable for personal injury, illness, loss of property, or any other harm that may occur during my participation. I attend at my own risk.",
                "required": True,
                "placeholder": None,
                "help_text": None,
            },
            {
                "id": "media_consent",
                "type": "checkbox",
                "label": "I consent to being photographed or filmed during the event. Images may be used for JLF social media and marketing (opt out by unchecking).",
                "required": False,
                "placeholder": None,
                "help_text": "Uncheck to opt out of photo/video.",
            },
            {
                "id": "emergency_contact_name",
                "type": "text",
                "label": "Emergency contact name",
                "required": True,
                "placeholder": "Full name",
                "help_text": None,
            },
            {
                "id": "emergency_contact_phone",
                "type": "text",
                "label": "Emergency contact phone",
                "required": True,
                "placeholder": "+1 (404) 555-0123",
                "help_text": None,
            },
        ],
    },
]


async def seed() -> None:
    async with async_session() as db:
        created = 0
        skipped = 0

        for tmpl_data in DEFAULT_TEMPLATES:
            # Check if a template with this name already exists
            result = await db.execute(
                select(FormTemplate).where(FormTemplate.name == tmpl_data["name"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  SKIP  {tmpl_data['name']!r} — already exists")
                skipped += 1
                continue

            template = FormTemplate(
                name=tmpl_data["name"],
                description=tmpl_data["description"],
                form_type=tmpl_data["form_type"],
                fields=tmpl_data["fields"],
                is_default=tmpl_data["is_default"],
                created_by=None,
            )
            db.add(template)
            print(f"  CREATE {tmpl_data['name']!r} ({tmpl_data['form_type'].value})")
            created += 1

        await db.commit()
        print(f"\nDone — {created} created, {skipped} skipped.")


if __name__ == "__main__":
    asyncio.run(seed())
