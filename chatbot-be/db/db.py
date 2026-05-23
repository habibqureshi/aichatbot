from configs import (
    DB_HOST,
    DB_PASS,
    DB_PORT,
    DB_USER,
    DB,
    INSTANCE_CONNECTION_NAME,
    USE_CLOUD_SQL,
)
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import URL
from google.cloud.sql.connector import Connector
from sqlalchemy import create_engine
from sqlalchemy.schema import CreateTable

Base = declarative_base()

engine = None
async_session = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if engine is None:
        await init_db()
    async with async_session() as session:
        yield session


async def init_db():

    global engine, async_session, connector
    if engine is None:
        if str(USE_CLOUD_SQL).lower() == "true":
            connector = Connector()
            print("Initializing database with cloud sql...")

            def getconn_async():
                """Returns an asynchronous connection using the Cloud SQL Connector."""
                return connector.connect(
                    instance_connection_string=INSTANCE_CONNECTION_NAME,
                    driver="pymysql",
                    user=DB_USER,
                    password=DB_PASS,
                    db=DB,
                )

            sync_engine = create_engine(
                "mysql+pymysql://",
                creator=getconn_async,
            )
            Base.metadata.create_all(sync_engine)
            sync_engine.dispose()
            engine = create_async_engine(
                "mysql+asyncmy://",
                creator=getconn_async,
                # Optional: Add pool settings specific to your needs
                pool_size=10,
                max_overflow=2,
            )
        else:
            print("Initializing database with local database...")

            local_url = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB}"
            local_async_url = (
                f"mysql+asyncmy://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB}"
            )

            sync_engine = create_engine(local_url)
            Base.metadata.create_all(sync_engine)
            sync_engine.dispose()

            engine = create_async_engine(local_async_url, pool_size=10, max_overflow=2)
        async_session = sessionmaker(
            bind=engine, class_=AsyncSession, expire_on_commit=False
        )
