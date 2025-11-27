from configs import DB_HOST, DB_PASS, DB_PORT, DB_USER, DB, INSTANCE_CONNECTION_NAME
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL
from google.cloud.sql.connector import Connector

Base = declarative_base()

engine = None
async_session = None
connector = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if engine is None:
        await init_db()
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    global engine, async_session, connector
    if engine is None:
        connector = Connector

        def getconn_async():
            """Returns an asynchronous connection using the Cloud SQL Connector."""
            # The 'asyncmy' driver uses 'mysqlclient' as its synchronous DBAPI
            # when used with the connector, or you can explicitly use 'pymysql'.
            # We use 'pymysql' here for explicit compatibility with the connector.
            return connector.connect_async(
                INSTANCE_CONNECTION_NAME,
                "pymysql",  # The DBAPI to use for the MySQL connection
                user=DB_USER,
                password=DB_PASS,
                db=DB,
            )

        engine = create_async_engine(
            "mysql+asyncmy://",
            creator=getconn_async,
            # Optional: Add pool settings specific to your needs
            pool_size=10,
            max_overflow=2,
        )
        async_session = sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
