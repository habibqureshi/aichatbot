from db.models import Customer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError


async def find_or_create_by_phone(
    phone_number: str, db: AsyncSession, tenant_id: int
) -> Customer:
    """Upsert customer by phone (Twilio inbound); name can be filled in later."""
    result = await db.execute(
        select(Customer).where(
            Customer.phone_number == phone_number,
            Customer.tenant_id == tenant_id,
        )
    )
    row = result.scalars().first()
    if row:
        return row
    customer = Customer(phone_number=phone_number, tenant_id=tenant_id, name=None)
    db.add(customer)
    try:
        await db.commit()
        await db.refresh(customer)
        return customer
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(Customer).where(
                Customer.phone_number == phone_number,
                Customer.tenant_id == tenant_id,
            )
        )
        return result.scalars().first()


async def find_or_create(
    name: str, phone_number: str | None, db: AsyncSession, tenant_id: int
) -> Customer | None:
    result = await db.execute(
        select(Customer).where(
            Customer.name == name, Customer.phone_number == phone_number, Customer.tenant_id == tenant_id
        ).limit(1))
    customer = result.scalars().first()
    if customer:
        return customer
    customer = Customer(name=name, phone_number=phone_number, tenant_id=tenant_id)
    db.add(customer)
    try:
        await db.commit()
        await db.refresh(customer)
        return customer
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(Customer).where(Customer.name == name, Customer.phone_number == phone_number, Customer.tenant_id == tenant_id).limit(1))
        return result.scalars().first()

async def find_by_id(
    id: int, db: AsyncSession, tenant_id: int
) -> Customer | None:
    result = await db.execute(
        select(Customer).where(Customer.id == id, Customer.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()