# Session 3: Multi-Guest Registration + Scholarship/Membership

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-guest group registration, membership discounts ($25 flat off), and scholarship pricing ($30 flat) with admin management UIs.

**Architecture:** New `memberships` and `scholarship_links` tables + new columns on `attendees`. New CRUD routers for both. Group registration endpoint creates N registrations linked by `group_id` (column already exists). Frontend adds guest count selector to registration form and two new admin pages.

**Tech Stack:** FastAPI + SQLAlchemy (backend), Next.js + React + TanStack Query + shadcn/ui (frontend)

---

## Task 1: Alembic Migration — New Tables + Attendee Columns

**Files:**
- Create: `src/backend/alembic/versions/d_session3_memberships_scholarships.py`

**Step 1: Create the migration file**

```bash
cd src/backend && python -m alembic revision -m "session3: memberships, scholarship_links, attendee columns"
```

Then write the migration with:

**upgrade():**
1. Create `memberships` table:
   - `id` UUID PK
   - `attendee_id` UUID FK→attendees, indexed
   - `tier` VARCHAR(50) default 'standard'
   - `discount_type` VARCHAR(20) default 'flat'
   - `discount_value_cents` INTEGER default 2500
   - `started_at` TIMESTAMPTZ not null
   - `expires_at` TIMESTAMPTZ nullable
   - `is_active` BOOLEAN default true
   - `created_at` TIMESTAMPTZ not null
   - `updated_at` TIMESTAMPTZ not null

2. Create `scholarship_links` table:
   - `id` UUID PK
   - `event_id` UUID FK→events, indexed
   - `attendee_id` UUID FK→attendees nullable, indexed
   - `code` VARCHAR(50) UNIQUE
   - `scholarship_price_cents` INTEGER default 3000
   - `max_uses` INTEGER default 1
   - `times_used` INTEGER default 0
   - `is_active` BOOLEAN default true
   - `created_by` UUID FK→users nullable
   - `created_at` TIMESTAMPTZ not null
   - `updated_at` TIMESTAMPTZ not null

3. Add columns to `attendees` (batch_alter_table):
   - `is_member` BOOLEAN default false
   - `membership_id` UUID FK→memberships nullable
   - `admin_notes` TEXT nullable

**Step 2: Run migration locally**

```bash
cd src/backend && python -m alembic upgrade head
```

**Step 3: Commit**

```bash
git add src/backend/alembic/
git commit -m "feat: add memberships, scholarship_links tables + attendee columns (migration)"
```

---

## Task 2: SQLAlchemy Models — Membership + ScholarshipLink

**Files:**
- Create: `src/backend/app/models/membership.py`
- Create: `src/backend/app/models/scholarship_link.py`
- Modify: `src/backend/app/models/attendee.py`
- Modify: `src/backend/app/models/__init__.py`

**Step 1: Create Membership model**

`src/backend/app/models/membership.py`:
```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Membership(TimestampMixin, Base):
    __tablename__ = "memberships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    attendee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attendees.id"), index=True)
    tier: Mapped[str] = mapped_column(String(50), default="standard")
    discount_type: Mapped[str] = mapped_column(String(20), default="flat")
    discount_value_cents: Mapped[int] = mapped_column(Integer, default=2500)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    attendee = relationship("Attendee", back_populates="membership", lazy="selectin")
```

**Step 2: Create ScholarshipLink model**

`src/backend/app/models/scholarship_link.py`:
```python
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class ScholarshipLink(TimestampMixin, Base):
    __tablename__ = "scholarship_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    attendee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("attendees.id"), nullable=True, index=True
    )
    code: Mapped[str] = mapped_column(String(50), unique=True)
    scholarship_price_cents: Mapped[int] = mapped_column(Integer, default=3000)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    event = relationship("Event", lazy="selectin")
    attendee = relationship("Attendee", lazy="selectin")
```

**Step 3: Update Attendee model**

Add to `src/backend/app/models/attendee.py`:
- `is_member: Mapped[bool]` (Boolean, default=False)
- `membership_id: Mapped[uuid.UUID | None]` (FK→memberships, nullable)
- `admin_notes: Mapped[str | None]` (Text, nullable)
- `membership = relationship("Membership", back_populates="attendee", uselist=False, lazy="selectin")`

**Step 4: Update `__init__.py`**

Add imports for `Membership` and `ScholarshipLink` and include in `__all__`.

**Step 5: Verify models load**

```bash
cd src/backend && python -c "from app.models import Membership, ScholarshipLink; print('OK')"
```

**Step 6: Commit**

```bash
git add src/backend/app/models/
git commit -m "feat: add Membership + ScholarshipLink models, update Attendee"
```

---

## Task 3: Pydantic Schemas — Membership + ScholarshipLink + Registration Updates

**Files:**
- Create: `src/backend/app/schemas/memberships.py`
- Create: `src/backend/app/schemas/scholarship_links.py`
- Modify: `src/backend/app/schemas/registration.py`

**Step 1: Create membership schemas**

`src/backend/app/schemas/memberships.py`:
```python
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MembershipCreate(BaseModel):
    attendee_id: UUID
    tier: str = "standard"
    discount_type: str = "flat"
    discount_value_cents: int = 2500
    expires_at: datetime | None = None


class MembershipUpdate(BaseModel):
    tier: str | None = None
    discount_value_cents: int | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


class MembershipResponse(BaseModel):
    id: UUID
    attendee_id: UUID
    tier: str
    discount_type: str
    discount_value_cents: int
    started_at: datetime
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    attendee_name: str | None = None
    attendee_email: str | None = None

    model_config = {"from_attributes": True}
```

**Step 2: Create scholarship schemas**

`src/backend/app/schemas/scholarship_links.py`:
```python
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class ScholarshipLinkCreate(BaseModel):
    event_id: UUID
    attendee_id: UUID | None = None
    code: str | None = None  # auto-generate if not provided
    scholarship_price_cents: int = 3000
    max_uses: int = 1


class ScholarshipLinkResponse(BaseModel):
    id: UUID
    event_id: UUID
    attendee_id: UUID | None = None
    code: str
    scholarship_price_cents: int
    max_uses: int
    times_used: int
    is_active: bool
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime
    event_name: str | None = None

    model_config = {"from_attributes": True}


class ScholarshipValidateResponse(BaseModel):
    valid: bool
    event_id: UUID | None = None
    event_name: str | None = None
    scholarship_price_cents: int | None = None
    message: str | None = None
```

**Step 3: Update registration schemas**

Add to `RegistrationCreate`:
- `scholarship_code: str | None = None`

Add to `RegistrationResponse`:
- `group_id: str | None = None`

Add new schema for group registration:
```python
class GuestRegistration(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    waiver_accepted: bool
    intake_data: dict | None = None

class GroupRegistrationCreate(BaseModel):
    guests: list[GuestRegistration]
    payment_method: str = "stripe"
    scholarship_code: str | None = None
    donation_amount_cents: int | None = None

class GroupRegistrationResponse(BaseModel):
    group_id: str
    registration_ids: list[str]
    checkout_url: str | None = None
    status: str
    message: str | None = None
```

**Step 4: Commit**

```bash
git add src/backend/app/schemas/
git commit -m "feat: add membership + scholarship schemas, group registration types"
```

---

## Task 4: Memberships CRUD Router

**Files:**
- Create: `src/backend/app/routers/memberships.py`
- Modify: `src/backend/app/main.py`

**Step 1: Create memberships router**

Follow the form_templates.py pattern exactly:
- `router = APIRouter(prefix="/memberships", tags=["memberships"])`
- GET `/` — list all (query param `is_active` filter)
- POST `/` — create (sets attendee.is_member=True, attendee.membership_id)
- PUT `/{id}` — update (partial)
- DELETE `/{id}` — deactivate (set is_active=False, attendee.is_member=False)

Include `_audit()` helper, `_membership_to_response()` converter.
All endpoints require `current_user: User = Depends(get_current_user)`.

**Step 2: Register in main.py**

Add `memberships` to import block and `app.include_router(memberships.router, prefix="/api/v1")`.

**Step 3: Verify endpoint loads**

```bash
cd src/backend && python -c "from app.main import app; print([r.path for r in app.routes if 'membership' in r.path])"
```

**Step 4: Commit**

```bash
git add src/backend/app/routers/memberships.py src/backend/app/main.py
git commit -m "feat: add memberships CRUD router"
```

---

## Task 5: Scholarship Links CRUD Router

**Files:**
- Create: `src/backend/app/routers/scholarship_links.py`
- Modify: `src/backend/app/main.py`

**Step 1: Create scholarship_links router**

- `router = APIRouter(prefix="/scholarship-links", tags=["scholarship-links"])`
- GET `/` — list all (query params: `event_id`, `is_active`)
- POST `/` — create (auto-generate code if not provided via `secrets.token_urlsafe(6)`)
- DELETE `/{id}` — deactivate (set is_active=False)
- GET `/validate/{code}` — public endpoint (no auth), validates code, returns ScholarshipValidateResponse

**Step 2: Register in main.py**

**Step 3: Commit**

```bash
git add src/backend/app/routers/scholarship_links.py src/backend/app/main.py
git commit -m "feat: add scholarship links CRUD router with code validation"
```

---

## Task 6: Group Registration Endpoint

**Files:**
- Modify: `src/backend/app/routers/registration.py`
- Modify: `src/backend/app/services/stripe_service.py`

**Step 1: Add group registration endpoint**

`POST /register/{event_slug}/group` in registration.py:
1. Look up event (same as single registration)
2. Check capacity for ALL guests at once
3. Generate `group_id = uuid4()`
4. For each guest in `data.guests`:
   - Get or create Attendee by email
   - Check for duplicate registration (skip if already registered, or 409)
   - Validate waiver_accepted
   - Sanitize intake_data
   - Determine price per guest:
     - If `scholarship_code`: validate code, use `scholarship_price_cents`
     - If attendee `is_member`: apply $25 discount (check max 3 members per event)
     - Otherwise: event price
   - Create Registration with `group_id`, `source=group`
5. If payment_method=stripe: create multi-line-item checkout session
6. If payment_method=cash: all get `cash_pending`
7. If scholarship: Stripe at discounted price, decrement `times_used`
8. Return `GroupRegistrationResponse`

**Step 2: Add scholarship validation to single registration endpoint**

Update existing `POST /register/{event_slug}`:
- Accept `scholarship_code` from `RegistrationCreate`
- If provided: validate code, set `payment_method=scholarship`, use scholarship price
- Route to Stripe at discounted amount

**Step 3: Update Stripe service for multi-line-item checkout**

Add `create_group_checkout_session()` to `stripe_service.py`:
```python
async def create_group_checkout_session(
    registrations: list[Registration],
    event: Event,
    amounts_cents: list[int],
    group_id: str,
) -> str:
    line_items = []
    for reg, amount in zip(registrations, amounts_cents):
        line_items.append({
            "price_data": {
                "currency": "usd",
                "unit_amount": amount,
                "product_data": {"name": f"{event.name} — {reg.attendee.first_name} {reg.attendee.last_name}"},
            },
            "quantity": 1,
        })
    session = stripe.checkout.Session.create(
        mode="payment",
        client_reference_id=group_id,
        customer_email=registrations[0].attendee.email,
        line_items=line_items,
        success_url=f"{settings.app_url}/register/{event.slug}/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/register/{event.slug}/cancelled",
        metadata={"group_id": group_id, "event_id": str(event.id)},
    )
    return session.url
```

**Step 4: Commit**

```bash
git add src/backend/app/routers/registration.py src/backend/app/services/stripe_service.py
git commit -m "feat: add group registration endpoint + scholarship support"
```

---

## Task 7: Backend Tests

**Files:**
- Modify: `src/backend/tests/conftest.py`
- Create: `src/backend/tests/test_memberships.py`
- Create: `src/backend/tests/test_scholarship_links.py`
- Create: `src/backend/tests/test_group_registration.py`

**Step 1: Add fixtures to conftest.py**

- `cash_event` fixture (event with `allow_cash_payment=True`)
- `sample_membership` fixture
- `sample_scholarship_link` fixture
- `auth_headers` fixture (login as sample_user, return Bearer token headers)

**Step 2: Write membership tests**

- test_create_membership
- test_list_memberships
- test_deactivate_membership
- test_create_membership_sets_attendee_is_member

**Step 3: Write scholarship tests**

- test_create_scholarship_link
- test_create_scholarship_link_auto_code
- test_validate_scholarship_code
- test_validate_invalid_code
- test_deactivate_scholarship_link

**Step 4: Write group registration tests**

- test_group_registration_cash (2 guests, cash payment)
- test_group_registration_creates_linked_registrations
- test_group_registration_capacity_check
- test_group_registration_duplicate_email_in_group (should fail if same email twice)

**Step 5: Run all tests**

```bash
cd src/backend && python -m pytest tests/ -v
```

**Step 6: Commit**

```bash
git add src/backend/tests/
git commit -m "test: add tests for memberships, scholarships, group registration"
```

---

## Task 8: Frontend API Client — Memberships + Scholarships + Group Registration

**Files:**
- Modify: `src/frontend/src/lib/api.ts`

**Step 1: Add types**

```typescript
export interface MembershipResponse {
  id: string;
  attendee_id: string;
  tier: string;
  discount_type: string;
  discount_value_cents: number;
  started_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  attendee_name: string | null;
  attendee_email: string | null;
}

export interface MembershipCreate {
  attendee_id: string;
  tier?: string;
  discount_value_cents?: number;
  expires_at?: string;
}

export interface ScholarshipLinkResponse {
  id: string;
  event_id: string;
  attendee_id: string | null;
  code: string;
  scholarship_price_cents: number;
  max_uses: number;
  times_used: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  event_name: string | null;
}

export interface ScholarshipLinkCreate {
  event_id: string;
  code?: string;
  scholarship_price_cents?: number;
  max_uses?: number;
}

export interface GuestData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  accommodation_type?: string;
  dietary_restrictions?: string;
  waiver_accepted: boolean;
  intake_data?: Record<string, Record<string, unknown>>;
}

export interface GroupRegistrationCreate {
  guests: GuestData[];
  payment_method?: "stripe" | "cash";
  scholarship_code?: string;
  donation_amount_cents?: number;
}
```

**Step 2: Add API methods**

```typescript
export const memberships = {
  list: (params?: { is_active?: boolean; page?: number; per_page?: number }) => { ... },
  create: (data: MembershipCreate) => { ... },
  update: (id: string, data: Partial<MembershipCreate> & { is_active?: boolean }) => { ... },
  delete: (id: string) => { ... },
};

export const scholarshipLinks = {
  list: (params?: { event_id?: string; is_active?: boolean }) => { ... },
  create: (data: ScholarshipLinkCreate) => { ... },
  delete: (id: string) => { ... },
  validate: (code: string) => { ... },
};
```

Add to `register` object:
```typescript
submitGroup: (slug: string, data: GroupRegistrationCreate) =>
  request<{ group_id: string; registration_ids: string[]; checkout_url: string | null; status: string }>(
    `/register/${slug}/group`,
    { method: "POST", body: JSON.stringify(data) }
  ),
```

Update `RegistrationCreate` type to include `scholarship_code?: string`.

**Step 3: Commit**

```bash
git add src/frontend/src/lib/api.ts
git commit -m "feat: add membership + scholarship + group registration API client"
```

---

## Task 9: Frontend — Admin Memberships Page

**Files:**
- Create: `src/frontend/src/app/(dashboard)/memberships/page.tsx`
- Modify: `src/frontend/src/app/(dashboard)/layout.tsx`

**Step 1: Create memberships page**

Follow form-templates page pattern exactly:
- Table/card layout showing: attendee name, email, tier, discount ($25), started date, status badge
- "Add Membership" button → dialog with attendee search (dropdown of attendees from `attendees.list()`)
- Toggle active/inactive via row action
- Delete (deactivate) via row action
- Dark mode support via `useDarkMode()`
- Demo mode support

**Step 2: Add nav item to layout.tsx**

Add after "Form Builder" item:
```tsx
{ icon: Crown, label: "Memberships", href: "/memberships" },
```
Import `Crown` from lucide-react (or use `Award`/`Star` — Crown fits membership concept best).

**Step 3: Build check**

```bash
cd src/frontend && npm run build
```

**Step 4: Commit**

```bash
git add src/frontend/src/app/\(dashboard\)/memberships/ src/frontend/src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add admin memberships page with CRUD"
```

---

## Task 10: Frontend — Admin Scholarships Page

**Files:**
- Create: `src/frontend/src/app/(dashboard)/scholarships/page.tsx`
- Modify: `src/frontend/src/app/(dashboard)/layout.tsx`

**Step 1: Create scholarships page**

Follow form-templates page pattern:
- Table/card layout: code, event name, max uses, times used, status badge
- "Create Scholarship Link" button → dialog: select event (dropdown), set max_uses, optionally set code
- "Copy Link" button per row — copies `{APP_URL}/register/{event_slug}?code={code}` to clipboard
- Deactivate button per row
- Dark mode + demo mode support

**Step 2: Add nav item to layout.tsx**

Add after Memberships:
```tsx
{ icon: GraduationCap, label: "Scholarships", href: "/scholarships" },
```
Import `GraduationCap` from lucide-react.

**Step 3: Build check**

```bash
cd src/frontend && npm run build
```

**Step 4: Commit**

```bash
git add src/frontend/src/app/\(dashboard\)/scholarships/ src/frontend/src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add admin scholarships page with link generation"
```

---

## Task 11: Frontend — Multi-Guest Registration UI

**Files:**
- Modify: `src/frontend/src/app/register/[slug]/registration-form.tsx`

**Step 1: Add guest count selector**

After the event info header, before the form card:
- "How many guests?" selector (1-10), styled as a row of number buttons or a select dropdown
- Default to 1 (single registration, current behavior)

**Step 2: Multi-guest form with tabs**

When guests > 1:
- Show tab bar: "Guest 1 (You)", "Guest 2", "Guest 3", etc.
- Each tab has the full form fields (name, email, phone, dynamic fields, waiver)
- Guest 1 pre-filled from the main form fields
- Track per-guest form data in state: `Record<number, GuestFormData>`
- Track per-guest dynamic data: `Record<number, Record<string, Record<string, unknown>>>`
- Track per-guest waiver acceptances: `Record<number, Record<string, boolean>>`

**Step 3: Combined price display**

Show at bottom before submit:
- "Registration Summary" section
- List each guest with their price
- Show discounts (member -$25, scholarship $30 flat)
- Show total

**Step 4: Submit handler for groups**

When guests > 1: call `register.submitGroup()` instead of `register.submit()`
When guests = 1: keep existing single registration flow

**Step 5: Scholarship code support**

Add optional "Have a scholarship code?" collapsed section:
- Text input for code
- "Apply" button that calls `scholarshipLinks.validate(code)`
- If valid: show scholarship price, update payment_method to scholarship

**Step 6: Build check**

```bash
cd src/frontend && npm run build
```

**Step 7: Commit**

```bash
git add src/frontend/src/app/register/
git commit -m "feat: add multi-guest registration UI with scholarship code support"
```

---

## Task 12: Demo Data Updates

**Files:**
- Modify: `src/frontend/src/lib/demo-data.ts`

**Step 1: Add demo memberships**

```typescript
export const DEMO_MEMBERSHIPS = [
  { id: "mem-1", attendee_id: "att-mara", tier: "standard", ... attendee_name: "Mara Chen", ... },
  { id: "mem-2", attendee_id: "att-devon", ... attendee_name: "Devon Okafor", ... },
  { id: "mem-3", attendee_id: "att-sage", ... attendee_name: "Sage Willowbrook", ... },
];
```

**Step 2: Add demo scholarship links**

```typescript
export const DEMO_SCHOLARSHIP_LINKS = [
  { id: "sch-1", event_id: "...", code: "FOREST30", max_uses: 5, times_used: 2, ... event_name: "Emerging from Winter Retreat" },
  { id: "sch-2", event_id: "...", code: "COMMUNITY", max_uses: 3, times_used: 0, ... event_name: "Community Weekend March" },
];
```

**Step 3: Add group registrations to demo data**

Add 2 group registrations (sharing a `group_id`) to the demo registrations array.

**Step 4: Build check + Commit**

```bash
cd src/frontend && npm run build
git add src/frontend/src/lib/demo-data.ts
git commit -m "feat: add demo data for memberships, scholarships, group registrations"
```

---

## Task 13: Final Verification

**Step 1: Run backend tests**

```bash
cd src/backend && python -m pytest tests/ -v
```

**Step 2: Run frontend build**

```bash
cd src/frontend && npm run build
```

**Step 3: Fix any issues found**

**Step 4: Final commit if any fixes needed**

**Step 5: Notify completion**

```bash
openclaw system event --text "Done: Session 3 — Multi-guest registration, membership/scholarship management, admin UIs" --mode now
```
