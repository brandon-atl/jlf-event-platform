# Multi-Guest Registration + Scholarship/Membership Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-guest group registration, membership discounts, and scholarship pricing to JLF Event Platform.

**Architecture:** Extend existing registration flow with group_id linking, add Membership and ScholarshipLink models, create admin CRUD pages following form-templates pattern. Registration endpoint gets a `/group` variant that creates N attendee+registration rows linked by shared UUID.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, React/Next.js, TanStack Query, shadcn/ui, Zod

---

### Task 1: Alembic Migration — memberships + scholarship_links tables, attendee columns

**Files:**
- Create: `src/backend/alembic/versions/<auto>_add_memberships_scholarship_links.py`

**Step 1: Generate migration**

```bash
cd src/backend && alembic revision -m "add memberships scholarship links"
```

**Step 2: Write upgrade() — create tables + add columns**

The migration must:
1. Create `memberships` table: id (UUID PK), attendee_id (FK→attendees), tier (VARCHAR(50) default 'standard'), discount_type (VARCHAR(20) default 'flat'), discount_value_cents (INT default 2500), started_at (TIMESTAMPTZ), expires_at (TIMESTAMPTZ nullable), is_active (BOOL default true), created_at (TIMESTAMPTZ)
2. Create `scholarship_links` table: id (UUID PK), event_id (FK→events), attendee_id (FK→attendees nullable), code (VARCHAR(50) UNIQUE), scholarship_price_cents (INT default 3000), max_uses (INT default 1), times_used (INT default 0), is_active (BOOL default true), created_by (FK→users nullable), created_at (TIMESTAMPTZ)
3. Add to `attendees`: `is_member` (BOOL default false), `membership_id` (UUID FK→memberships nullable), `admin_notes` (TEXT nullable)

Use `op.create_table()` for new tables. Use `with op.batch_alter_table("attendees") as batch_op:` for column additions (SQLite compat). Down revision is `c8e4f2a61d3b`.

**Step 3: Write downgrade()**

Drop columns from attendees, drop scholarship_links table, drop memberships table.

**Step 4: Run migration locally**

```bash
cd src/backend && alembic upgrade head
```

**Step 5: Commit**

```bash
git add src/backend/alembic/versions/
git commit -m "feat: add memberships and scholarship_links migration"
```

---

### Task 2: SQLAlchemy Models — Membership + ScholarshipLink

**Files:**
- Create: `src/backend/app/models/membership.py`
- Create: `src/backend/app/models/scholarship_link.py`
- Modify: `src/backend/app/models/attendee.py`
- Modify: `src/backend/app/models/__init__.py`

**Step 1: Create Membership model**

```python
# src/backend/app/models/membership.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, gen_uuid

class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    attendee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attendees.id"), index=True)
    tier: Mapped[str] = mapped_column(String(50), default="standard")
    discount_type: Mapped[str] = mapped_column(String(20), default="flat")
    discount_value_cents: Mapped[int] = mapped_column(Integer, default=2500)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    attendee = relationship("Attendee", back_populates="membership", foreign_keys=[attendee_id])
```

**Step 2: Create ScholarshipLink model**

```python
# src/backend/app/models/scholarship_link.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, gen_uuid

class ScholarshipLink(Base):
    __tablename__ = "scholarship_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    attendee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("attendees.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    scholarship_price_cents: Mapped[int] = mapped_column(Integer, default=3000)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    event = relationship("Event", lazy="selectin")
    creator = relationship("User", lazy="selectin")
```

**Step 3: Update Attendee model**

Add to `Attendee` class in `models/attendee.py`:
```python
is_member: Mapped[bool] = mapped_column(Boolean, default=False)
membership_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("memberships.id"), nullable=True)
admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

membership = relationship("Membership", back_populates="attendee", foreign_keys=[membership_id], lazy="selectin")
```

**Step 4: Update `models/__init__.py`**

Add imports for `Membership` and `ScholarshipLink`. Add to `__all__`.

**Step 5: Commit**

```bash
git add src/backend/app/models/
git commit -m "feat: add Membership and ScholarshipLink models, update Attendee"
```

---

### Task 3: Pydantic Schemas — Memberships + Scholarship Links

**Files:**
- Create: `src/backend/app/schemas/memberships.py`
- Create: `src/backend/app/schemas/scholarship_links.py`
- Modify: `src/backend/app/schemas/registrations.py` — add group_id, payment_method to RegistrationResponse
- Modify: `src/backend/app/schemas/registration.py` — add GuestCreate, GroupRegistrationCreate, GroupRegistrationResponse

**Step 1: Create membership schemas**

```python
# schemas/memberships.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

class MembershipCreate(BaseModel):
    attendee_id: UUID
    tier: str = "standard"
    discount_type: str = "flat"
    discount_value_cents: int = 2500

class MembershipUpdate(BaseModel):
    tier: str | None = None
    discount_value_cents: int | None = None
    is_active: bool | None = None

class MembershipResponse(BaseModel):
    id: UUID
    attendee_id: UUID
    attendee_name: str | None = None
    attendee_email: str | None = None
    tier: str
    discount_type: str
    discount_value_cents: int
    started_at: datetime
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}
```

**Step 2: Create scholarship link schemas**

```python
# schemas/scholarship_links.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

class ScholarshipLinkCreate(BaseModel):
    event_id: UUID
    code: str | None = None  # auto-generate if not provided
    scholarship_price_cents: int = 3000
    max_uses: int = 1
    attendee_id: UUID | None = None

class ScholarshipLinkResponse(BaseModel):
    id: UUID
    event_id: UUID
    event_name: str | None = None
    attendee_id: UUID | None = None
    code: str
    scholarship_price_cents: int
    max_uses: int
    times_used: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class ScholarshipValidateResponse(BaseModel):
    valid: bool
    event_name: str | None = None
    event_slug: str | None = None
    scholarship_price_cents: int | None = None
    message: str | None = None
```

**Step 3: Add group registration schemas to `schemas/registration.py`**

```python
class GuestCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    waiver_accepted: bool
    intake_data: dict | None = None

class GroupRegistrationCreate(BaseModel):
    guests: list[GuestCreate]
    payment_method: str = "stripe"
    donation_amount_cents: int | None = None
    scholarship_code: str | None = None

class GroupRegistrationResponse(BaseModel):
    group_id: UUID
    registrations: list[RegistrationResponse]
    checkout_url: str | None = None
    total_amount_cents: int | None = None
```

**Step 4: Update operator RegistrationResponse in `schemas/registrations.py`**

Add `group_id: UUID | None = None` and `payment_method: str | None = None` fields. Update `_reg_to_response()` in `routers/registrations.py` to include these.

**Step 5: Commit**

```bash
git add src/backend/app/schemas/ src/backend/app/routers/registrations.py
git commit -m "feat: add membership and scholarship schemas, group registration types"
```

---

### Task 4: Membership CRUD Router

**Files:**
- Create: `src/backend/app/routers/memberships.py`
- Modify: `src/backend/app/main.py` — register router

**Step 1: Create memberships router**

Follow the `form_templates.py` CRUD pattern:
- `GET /memberships` — list all, optional `?is_active=true` filter. Join attendee for name/email.
- `POST /memberships` — create membership, set attendee.is_member=true, attendee.membership_id. 409 if attendee already has active membership.
- `PUT /memberships/{id}` — partial update via `model_dump(exclude_unset=True)`.
- `DELETE /memberships/{id}` — soft delete: set is_active=false, attendee.is_member=false, attendee.membership_id=None. Audit log.

All endpoints require auth (use `Depends(require_admin)` pattern from existing routers). Include audit logging.

**Step 2: Register router in main.py**

```python
from app.routers import memberships
app.include_router(memberships.router, prefix="/api/v1")
```

**Step 3: Commit**

```bash
git add src/backend/app/routers/memberships.py src/backend/app/main.py
git commit -m "feat: add memberships CRUD router"
```

---

### Task 5: Scholarship Links CRUD Router

**Files:**
- Create: `src/backend/app/routers/scholarship_links.py`
- Modify: `src/backend/app/main.py` — register router

**Step 1: Create scholarship_links router**

- `GET /scholarship-links` — list all, optional `?event_id=X&is_active=true` filters. Join event for name.
- `POST /scholarship-links` — create. Auto-generate 8-char alphanumeric code if not provided. 409 if code already exists.
- `DELETE /scholarship-links/{id}` — soft delete: set is_active=false.
- `GET /scholarship-links/validate/{code}` — **no auth required** (public endpoint for registration form). Return event info + price if valid, error message if not.

All CRUD endpoints except validate require auth. Include audit logging on create/delete.

Code generation: `secrets.token_urlsafe(6)` → 8 chars, URL-safe.

**Step 2: Register router in main.py**

```python
from app.routers import scholarship_links
app.include_router(scholarship_links.router, prefix="/api/v1")
```

**Step 3: Commit**

```bash
git add src/backend/app/routers/scholarship_links.py src/backend/app/main.py
git commit -m "feat: add scholarship links CRUD router with code validation"
```

---

### Task 6: Group Registration Endpoint + Scholarship/Membership Logic

**Files:**
- Modify: `src/backend/app/routers/registration.py`
- Modify: `src/backend/app/services/stripe_service.py`

**Step 1: Add `create_group_checkout_session` to stripe_service.py**

New function that accepts a list of (registration, event, amount_cents) tuples and creates a multi-line-item Checkout Session. Uses `group_id` as `client_reference_id`. Each line item = one guest's price.

```python
async def create_group_checkout_session(
    registrations: list[Registration],
    event: Event,
    amounts: list[int],
    group_id: str,
) -> str:
    line_items = [
        {
            "price_data": {
                "currency": "usd",
                "unit_amount": amount,
                "product_data": {"name": f"{event.name} — {reg.attendee.first_name} {reg.attendee.last_name}"},
            },
            "quantity": 1,
        }
        for reg, amount in zip(registrations, amounts)
    ]
    session = stripe.checkout.Session.create(
        mode="payment",
        client_reference_id=group_id,
        customer_email=registrations[0].attendee.email,
        line_items=line_items,
        success_url=f"{settings.app_url}/register/{event.slug}/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/register/{event.slug}/cancelled",
        metadata={"group_id": group_id, "event_id": str(event.id), "event_slug": event.slug},
    )
    return session.url
```

**Step 2: Add `POST /register/{event_slug}/group` endpoint**

Flow:
1. Fetch event by slug (404 if not found/inactive)
2. Capacity check: current registrations + len(guests) ≤ capacity
3. Validate scholarship_code if provided (exists, active, times_used + len(guests) ≤ max_uses, event matches)
4. Generate shared `group_id = uuid4()`
5. For each guest:
   a. Find-or-create Attendee by email
   b. Duplicate check (409 if any guest already registered)
   c. Validate waiver_accepted
   d. Sanitize intake_data
   e. Calculate price: base price → apply member discount ($25 off, max 3 per event) → apply scholarship ($30 flat)
   f. Create Registration with group_id, correct payment_method, correct status
6. Route by payment method:
   - stripe/scholarship → create_group_checkout_session() → return checkout_url
   - cash → all CASH_PENDING → return success
   - free → all COMPLETE → return success
7. If scholarship: increment scholarship_link.times_used

**Step 3: Update existing `POST /register/{event_slug}` for scholarship support**

Add optional `scholarship_code` field to `RegistrationCreate`. If provided:
1. Validate code (same checks as group endpoint)
2. Set payment_method = scholarship
3. Set price = scholarship_price_cents from the link
4. Increment times_used
5. Route to Stripe at discounted price

**Step 4: Update webhook handler**

In `routers/webhooks.py`, the `checkout.session.completed` handler currently looks up registration by `client_reference_id`. For group registrations, `client_reference_id` = `group_id`, and `metadata.group_id` is set. Update to:
- Check if `metadata.group_id` exists
- If yes: find all registrations with that group_id, mark all as COMPLETE
- If no: existing single-registration flow

**Step 5: Commit**

```bash
git add src/backend/app/routers/registration.py src/backend/app/routers/webhooks.py src/backend/app/services/stripe_service.py
git commit -m "feat: add group registration endpoint with scholarship and membership discounts"
```

---

### Task 7: Frontend — Multi-Guest Registration UI

**Files:**
- Modify: `src/frontend/src/app/register/[slug]/registration-form.tsx`
- Modify: `src/frontend/src/lib/api.ts`

**Step 1: Add API types and functions**

In `api.ts`:
- Add `GuestData` type matching `GuestCreate` schema
- Add `GroupRegistrationPayload` type
- Add `register.submitGroup(slug, payload)` → POST `/register/{slug}/group`
- Add `register.validateScholarship(code)` → GET `/scholarship-links/validate/{code}`

**Step 2: Add guest count selector**

At the top of the form (after event info, before "Your Information"):
- "How many guests are you registering?" — number input or stepper (1-10)
- Default: 1 (solo registration, existing flow)
- When > 1: switch to tabbed/stepper multi-guest form

**Step 3: Build multi-guest form UI**

When guest count > 1:
- Show tab bar: "Guest 1 (You)", "Guest 2", "Guest 3", etc.
- Each tab has the full form fields (name, email, phone, dietary, dynamic forms, waiver)
- Guest 1 pre-fills from payer info
- Shared across all guests: payment_method, scholarship_code
- Bottom shows combined total with discount breakdown

State management: `guests: GuestData[]` array, indexed by tab.

**Step 4: Add scholarship code input**

Below payment method selector (or above it):
- "Have a scholarship code?" expandable section
- Text input for code
- On blur/enter: call `register.validateScholarship(code)`
- Show validation result: green check + "$30 per guest" or red error
- When valid: override displayed price, set payment_method to scholarship internally

**Step 5: Update form submission**

- If guest count === 1 and no scholarship: use existing `register.submit()` (backward compatible)
- If guest count > 1 OR scholarship: use `register.submitGroup()` with all guest data
- Handle checkout_url redirect same as before

**Step 6: Commit**

```bash
cd src/frontend && npm run build  # verify no TS errors
git add src/frontend/src/
git commit -m "feat: multi-guest registration UI with scholarship code support"
```

---

### Task 8: Frontend — Admin Memberships Page

**Files:**
- Create: `src/frontend/src/app/(dashboard)/memberships/page.tsx`
- Modify: `src/frontend/src/app/(dashboard)/layout.tsx` — add nav item
- Modify: `src/frontend/src/lib/api.ts` — add memberships API namespace

**Step 1: Add API namespace**

```typescript
memberships: {
  list: (params?) => request<{data: Membership[], meta: PaginationMeta}>(`/memberships?${qs}`),
  create: (data) => request<Membership>('/memberships', { method: 'POST', body: data }),
  update: (id, data) => request<Membership>(`/memberships/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/memberships/${id}`, { method: 'DELETE' }),
}
```

**Step 2: Build memberships page**

Follow form-templates page pattern:
- Table with columns: Attendee Name, Email, Tier, Discount, Started, Status (active/inactive badge)
- "Add Membership" button → Dialog with attendee search (by email), tier selection
- Toggle active/inactive via switch or button
- Use `useQuery` + `useMutation` + `queryClient.invalidateQueries` pattern
- Demo mode: return demo memberships from demo-data.ts

**Step 3: Add nav item to dashboard layout**

In `layout.tsx` nav array, add after "Form Builder":
```typescript
{ icon: Award, label: "Memberships", href: "/memberships" },
```

Import `Award` from lucide-react.

**Step 4: Commit**

```bash
cd src/frontend && npm run build
git add src/frontend/src/
git commit -m "feat: admin memberships page with CRUD"
```

---

### Task 9: Frontend — Admin Scholarships Page

**Files:**
- Create: `src/frontend/src/app/(dashboard)/scholarships/page.tsx`
- Modify: `src/frontend/src/app/(dashboard)/layout.tsx` — add nav item
- Modify: `src/frontend/src/lib/api.ts` — add scholarshipLinks API namespace

**Step 1: Add API namespace**

```typescript
scholarshipLinks: {
  list: (params?) => request<{data: ScholarshipLink[], meta: PaginationMeta}>(`/scholarship-links?${qs}`),
  create: (data) => request<ScholarshipLink>('/scholarship-links', { method: 'POST', body: data }),
  delete: (id) => request(`/scholarship-links/${id}`, { method: 'DELETE' }),
}
```

**Step 2: Build scholarships page**

Follow form-templates page pattern:
- Table with columns: Code, Event, Max Uses, Times Used, Status, Created
- "Create Scholarship Link" button → Dialog: select event (dropdown from events list), max_uses, optional custom code
- "Copy Link" button: copies `{APP_URL}/register/{event_slug}?code={code}` to clipboard
- "Deactivate" button
- Demo mode: return demo scholarship links

**Step 3: Add nav item to dashboard layout**

In `layout.tsx` nav array, add after "Memberships":
```typescript
{ icon: Gift, label: "Scholarships", href: "/scholarships" },
```

Import `Gift` from lucide-react.

**Step 4: Commit**

```bash
cd src/frontend && npm run build
git add src/frontend/src/
git commit -m "feat: admin scholarships page with link generation"
```

---

### Task 10: Demo Data + Final Verification

**Files:**
- Modify: `src/frontend/src/lib/demo-data.ts`

**Step 1: Add demo memberships**

```typescript
export const DEMO_MEMBERSHIPS = [
  { id: "mem-1", attendee_id: "att-jane", attendee_name: "Jane Doe", attendee_email: "jane@example.com", tier: "standard", discount_type: "flat", discount_value_cents: 2500, started_at: "2025-12-01T00:00:00Z", expires_at: null, is_active: true, created_at: "2025-12-01T00:00:00Z" },
  { id: "mem-2", attendee_id: "att-mike", attendee_name: "Mike Johnson", attendee_email: "mike@example.com", tier: "standard", discount_type: "flat", discount_value_cents: 2500, started_at: "2026-01-15T00:00:00Z", expires_at: null, is_active: true, created_at: "2026-01-15T00:00:00Z" },
  { id: "mem-3", attendee_id: "att-sarah", attendee_name: "Sarah Williams", attendee_email: "sarah@example.com", tier: "standard", discount_type: "flat", discount_value_cents: 2500, started_at: "2026-02-01T00:00:00Z", expires_at: null, is_active: false, created_at: "2026-02-01T00:00:00Z" },
];
```

**Step 2: Add demo scholarship links**

```typescript
export const DEMO_SCHOLARSHIP_LINKS = [
  { id: "sch-1", event_id: "e1", event_name: "Emerging from Winter Retreat", code: "SCHOLAR1", scholarship_price_cents: 3000, max_uses: 3, times_used: 1, is_active: true, created_at: "2026-02-15T00:00:00Z" },
  { id: "sch-2", event_id: "e3", event_name: "Community Weekend March", code: "LOVEJLF", scholarship_price_cents: 3000, max_uses: 5, times_used: 0, is_active: true, created_at: "2026-02-20T00:00:00Z" },
];
```

**Step 3: Add group registrations to demo data**

Add 2 group registrations (3 guests each) to the demo registrations array with shared `group_id` UUIDs.

**Step 4: Final build verification**

```bash
cd src/frontend && npm run build
cd src/backend && python -m pytest tests/ -v
```

**Step 5: Commit**

```bash
git add src/frontend/src/lib/demo-data.ts
git commit -m "feat: add demo data for memberships, scholarships, and group registrations"
```
