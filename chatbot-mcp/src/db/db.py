from src.configs import DB_HOST, DB_PASS, DB_PORT, DB_USER, DB, INSTANCE_CONNECTION_NAME
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL
from contextlib import asynccontextmanager
from google.cloud.sql.connector import Connector

Base = declarative_base()

engine = None
async_session = None
connector = Connector()


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    global engine, async_session
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

        def getconn_async():
            """Returns an asynchronous connection using the Cloud SQL Connector."""
            return connector.connect(
                instance_connection_string=INSTANCE_CONNECTION_NAME,
                driver="pymysql",
                user=DB_USER,
                password=DB_PASS,
                db=DB,
            )

        engine = create_async_engine(
            "mysql+asyncmy://",
            creator=getconn_async,
            pool_size=10,
            max_overflow=2,
            echo=True,
        )
        async_session = sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )
