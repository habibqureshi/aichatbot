from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Tenant
from db.db import get_db
from sqlalchemy.future import select


class TenantContext:
    def __init__(self, tenant: Tenant):
        self.tenant: Tenant = tenant
        self.tenant_id = tenant.id

    @classmethod
    async def from_request(cls, request: Request, db: AsyncSession):
        host = request.headers.get("host")
        print(f"Host: {host}")
        if not host:
            print(f"Missing host header")
            raise HTTPException(status_code=400, detail="Missing host header")
        result = await db.execute(select(Tenant).where(Tenant.host == host))
        # `scalar_one_or_none()` is a SQLAlchemy method that fetches exactly one row from the result set or returns None if there are no rows.
        # It will raise an exception if there is more than one row, ensuring only a single result or no result at all.
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(
                status_code=400, detail=f"No tenant found for host: {host}"
            )
        return cls(tenant)


async def get_tenant_context(request: Request, db: AsyncSession = Depends(get_db)):
    return await TenantContext.from_request(request, db)
