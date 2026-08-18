"""Small POS-owned, additive schema migrations for shared POS data."""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@postgres:5432/jewellery_erp")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as connection:
        await connection.execute(text("SELECT pg_advisory_xact_lock(810001)"))
        await connection.execute(text("CREATE TABLE IF NOT EXISTS pos_schema_migrations (version varchar(64) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"))
        applied = (await connection.execute(text("SELECT 1 FROM pos_schema_migrations WHERE version='001_user_phone'"))).first()
        if not applied:
            await connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(20)"))
            await connection.execute(text("INSERT INTO pos_schema_migrations(version) VALUES ('001_user_phone')"))
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
