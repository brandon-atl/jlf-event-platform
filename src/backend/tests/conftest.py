import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.limiter import limiter
from app.models import Base
from app.main import app

# Disable rate limiting for tests
limiter.enabled = False
from app.models import (
    AccommodationType,
    Attendee,
    CoCreator,
    Event,
    EventCoCreator,
    EventStatus,
    Expense,
    PricingModel,
    Registration,
    RegistrationSource,
    RegistrationStatus,
    User,
    UserRole,
)
from app.models.expense import ActorType, ExpenseCategory
from app.services.auth_service import create_access_token, hash_password

# File-based SQLite for tests — ensures all sessions/connections share the same DB
# (in-memory SQLite with multiple connections each get isolated DBs)
import tempfile, os as _os
_tmp_fd, _tmp_db = tempfile.mkstemp(suffix=".db", prefix="jlf_test_")
_os.close(_tmp_fd)  # close the fd; SQLAlchemy opens its own connection
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{_tmp_db}"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, clean data after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Delete all rows from all tables in reverse dependency order.
    # Using DELETE instead of DROP/CREATE avoids SQLite connection locking issues.
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


def pytest_sessionfinish(session, exitstatus):
    """Clean up temp DB file after test session."""
    if _os.path.exists(_tmp_db):
        _os.unlink(_tmp_db)


@pytest_asyncio.fixture
async def db_session(setup_database):
    """Provide a database session for direct DB manipulation in tests."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# --- Factory fixtures ---


@pytest_asyncio.fixture
async def sample_event(db_session: AsyncSession) -> Event:
    """Create a standard paid event."""
    event = Event(
        id=uuid.uuid4(),
        name="Emerging from Winter Retreat",
        slug="emerging-from-winter",
        description="A weekend retreat at Just Love Forest",
        event_date=datetime(2026, 3, 15, 13, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 3, 16, 11, 30, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        capacity=20,
        meeting_point_a="Main gate parking area",
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


@pytest_asyncio.fixture
async def free_event(db_session: AsyncSession) -> Event:
    """Create a free event (e.g., Green Burial Tour)."""
    event = Event(
        id=uuid.uuid4(),
        name="Green Burial Tour",
        slug="green-burial-tour",
        description="Free guided tour",
        event_date=datetime(2026, 3, 20, 10, 0, tzinfo=timezone.utc),
        event_type="green_burial_tour",
        pricing_model=PricingModel.free,
        capacity=None,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


@pytest_asyncio.fixture
async def full_event(db_session: AsyncSession) -> Event:
    """Create an event at full capacity."""
    event = Event(
        id=uuid.uuid4(),
        name="Full Retreat",
        slug="full-retreat",
        description="This event is full",
        event_date=datetime(2026, 4, 1, 13, 0, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        capacity=1,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.flush()

    # Add one attendee to fill it
    attendee = Attendee(
        id=uuid.uuid4(),
        email="existing@example.com",
        first_name="Existing",
        last_name="Attendee",
    )
    db_session.add(attendee)
    await db_session.flush()

    registration = Registration(
        id=uuid.uuid4(),
        attendee_id=attendee.id,
        event_id=event.id,
        status=RegistrationStatus.complete,
        waiver_accepted_at=datetime.now(timezone.utc),
        source=RegistrationSource.registration_form,
    )
    db_session.add(registration)
    await db_session.commit()
    await db_session.refresh(event)
    return event


@pytest_asyncio.fixture
async def sample_attendee(db_session: AsyncSession) -> Attendee:
    """Create a sample attendee."""
    attendee = Attendee(
        id=uuid.uuid4(),
        email="jane@example.com",
        first_name="Jane",
        last_name="Doe",
        phone="+14045551234",
    )
    db_session.add(attendee)
    await db_session.commit()
    await db_session.refresh(attendee)
    return attendee


@pytest_asyncio.fixture
async def sample_registration(
    db_session: AsyncSession, sample_event: Event, sample_attendee: Attendee
) -> Registration:
    """Create a PENDING_PAYMENT registration."""
    registration = Registration(
        id=uuid.uuid4(),
        attendee_id=sample_attendee.id,
        event_id=sample_event.id,
        status=RegistrationStatus.pending_payment,
        stripe_checkout_session_id="cs_test_123",
        waiver_accepted_at=datetime.now(timezone.utc),
        accommodation_type=AccommodationType.bell_tent,
        source=RegistrationSource.registration_form,
    )
    db_session.add(registration)
    await db_session.commit()
    await db_session.refresh(registration)
    return registration


@pytest_asyncio.fixture
async def sample_user(db_session: AsyncSession) -> User:
    """Create a sample admin user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@justloveforest.com",
        name="Admin User",
        role=UserRole.admin,
        password_hash=hash_password("testpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def sample_admin(sample_user: User) -> User:
    """Create a sample admin user."""
    return sample_user


@pytest_asyncio.fixture
async def auth_client(client, sample_admin):
    """HTTP client with admin authentication."""
    token = create_access_token({"sub": str(sample_admin.id), "role": "admin"})
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest_asyncio.fixture
async def session(db_session):
    """Alias for db_session to match test usage."""
    return db_session


@pytest_asyncio.fixture
async def sample_expense(db_session: AsyncSession, sample_event: Event) -> Expense:
    """Create a sample expense."""
    expense = Expense(
        event_id=sample_event.id,
        submitted_by=None,
        actor_type=ActorType.admin,
        description="Test expense",
        amount_cents=2500,  # $25.00
        category=ExpenseCategory.groceries,
        notes="Test notes"
    )
    db_session.add(expense)
    await db_session.commit()
    await db_session.refresh(expense)
    return expense


@pytest_asyncio.fixture
async def sample_co_creator(db_session: AsyncSession) -> CoCreator:
    """Create a sample co-creator."""
    co_creator = CoCreator(
        name="Test Co-Creator",
        email="cocreator@test.com"
    )
    db_session.add(co_creator)
    await db_session.flush()
    await db_session.refresh(co_creator)
    return co_creator


@pytest_asyncio.fixture
async def event_with_co_creator(db_session: AsyncSession, sample_event: Event, sample_co_creator: CoCreator) -> Event:
    """Link co-creator to event with split percentage."""
    from decimal import Decimal
    event_co_creator = EventCoCreator(
        event_id=sample_event.id,
        co_creator_id=sample_co_creator.id,
        can_see_amounts=True,
        can_upload_expenses=True,
        split_percentage=Decimal('100.00')  # 100% split (single co-creator in tests)
    )
    db_session.add(event_co_creator)
    await db_session.commit()
    return sample_event


@pytest_asyncio.fixture
async def completed_registrations(db_session: AsyncSession, event_with_co_creator: Event) -> list[Registration]:
    """Create some completed registrations for revenue calculation."""
    registrations = []
    for i in range(3):
        # Each registration needs a unique attendee (UNIQUE constraint on attendee_id + event_id)
        attendee = Attendee(
            first_name=f"TestAttendee{i}",
            last_name=f"Settlement{i}",
            email=f"settlement{i}@test.com",
            phone=f"555000{i}",
        )
        db_session.add(attendee)
        await db_session.flush()

        registration = Registration(
            attendee_id=attendee.id,
            event_id=event_with_co_creator.id,
            status=RegistrationStatus.complete,
            payment_amount_cents=10000,  # $100 each
            payment_method="stripe",
            source="registration_form",
            waiver_accepted_at=datetime(2026, 3, 1, tzinfo=timezone.utc)
        )
        db_session.add(registration)
        registrations.append(registration)

    await db_session.commit()
    return registrations


@pytest_asyncio.fixture
async def sample_expenses(db_session: AsyncSession, event_with_co_creator: Event) -> list[Expense]:
    """Create some expenses for the event."""
    expenses = []
    for i, amount in enumerate([2000, 1500], 1):  # $20 + $15 = $35 total
        expense = Expense(
            event_id=event_with_co_creator.id,
            submitted_by=None,
            actor_type=ActorType.admin,
            description=f"Test expense {i}",
            amount_cents=amount,
            category=ExpenseCategory.groceries
        )
        db_session.add(expense)
        expenses.append(expense)

    await db_session.commit()
    return expenses
