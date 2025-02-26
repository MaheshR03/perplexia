from sqlalchemy import create_engine, create_async_engine, sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from .config import settings

DATABASE_URL = settings.POSTGRES_DB_URL
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

def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_neon_db():
    db = NeonAsyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
