from configs import DB_HOST, DB_PASS, DB_PORT, DB_USER, DB
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL

Base = declarative_base()

engine = None
async_session = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if engine is None:
        await init_db()
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    global engine, async_session
    if engine is None:
        url = URL.create(
            drivername="mysql+asyncmy",
            username=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT,
            database=DB,
        )
        engine = create_async_engine(url=url)
        async_session = sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
