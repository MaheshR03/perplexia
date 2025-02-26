from sqlalchemy import create_engine, AsyncSession 
from sqlalchemy.orm import declarative_base
from .config import settings

DATABASE_URL = settings.POSTGRES_DB_URL

engine = create_async_engine(DATABASE_URL) 
AsyncSessionLocal = sessionmaker( 
    bind=engine, class_=AsyncSession, expire_on_commit=False 
)

Base = declarative_base()

def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        db.close()