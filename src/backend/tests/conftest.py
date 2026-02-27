import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.models import Base
from app.main import app
from app.models import (
    AccommodationType,
    Attendee,
    Event,
    EventStatus,
    PricingModel,
    Registration,
    RegistrationSource,
    RegistrationStatus,
    User,
    UserRole,
)
from app.services.auth_service import hash_password

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
    """Create all tables before each test, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def pytest_sessionfinish(session, exitstatus):
    """Clean up temp DB file after test session."""
    if _os.path.exists(_tmp_db):
        _os.unlink(_tmp_db)


@pytest_asyncio.fixture
async def db_session():
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
