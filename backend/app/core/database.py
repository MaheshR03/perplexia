from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings
import ssl

Base = declarative_base()           # For common tables (Supabase)
NeonBase = declarative_base()       # For Neon-specific tables

# Remove sslmode from the URL string
DATABASE_URL = f"postgresql+asyncpg://{settings.SUPABASE_DB_USER}:{settings.SUPABASE_DB_PASSWORD}@{settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT}/{settings.SUPABASE_DB_DBNAME}"

NEON_DATABASE_URL = f"postgresql+asyncpg://{settings.NEOND_DB_USER}:{settings.NEOND_DB_PASSWORD}@{settings.NEOND_DB_HOST}/{settings.NEOND_DB_NAME}"

# Create SSL context for secure connections
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Pass SSL configuration as connect_args
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"ssl": ssl_context}
)

neon_engine = create_async_engine(NEON_DATABASE_URL)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

NeonAsyncSessionLocal = sessionmaker(
    bind=neon_engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()

async def get_neon_db():
    db = NeonAsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()