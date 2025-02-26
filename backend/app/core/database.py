from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings



DATABASE_URL = f"postgresql+asyncpg://{settings.SUPABASE_DB_USER}:{settings.SUPABASE_DB_PASSWORD}@{settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT}/{settings.SUPABASE_DB_DBNAME}?sslmode=require"
NEON_DATABASE_URL = f"postgresql+asyncpg://{settings.NEOND_DB_USER}:{settings.NEOND_DB_PASSWORD}@{settings.NEOND_DB_HOST}/{settings.NEOND_DB_NAME}"

engine = create_async_engine(DATABASE_URL)
neon_engine = create_async_engine(NEON_DATABASE_URL)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

NeonAsyncSessionLocal = sessionmaker(
    bind=neon_engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

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