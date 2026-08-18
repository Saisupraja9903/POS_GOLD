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
        applied = (await connection.execute(text("SELECT 1 FROM pos_schema_migrations WHERE version='002_user_manager_id'"))).first()
        if not applied:
            await connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id uuid"))
            await connection.execute(text("CREATE INDEX IF NOT EXISTS ix_users_manager_id ON users(manager_id)"))
            await connection.execute(text("""DO $$ BEGIN
                ALTER TABLE users ADD CONSTRAINT fk_users_manager_id_users FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL; END $$"""))
            await connection.execute(text("""UPDATE users salesperson SET manager_id=managers.manager_id
                FROM (SELECT u.branch_id, min(u.id::text)::uuid manager_id
                      FROM users u JOIN roles r ON r.id=u.role_id
                      WHERE r.code='SALES_MANAGER' AND u.is_active=true
                      GROUP BY u.branch_id HAVING count(*)=1) managers,
                     roles salesperson_role
                WHERE salesperson.branch_id=managers.branch_id
                  AND salesperson.role_id=salesperson_role.id
                  AND salesperson_role.code='SALES_PERSON'
                  AND salesperson.manager_id IS NULL"""))
            await connection.execute(text("INSERT INTO pos_schema_migrations(version) VALUES ('002_user_manager_id')"))
        applied = (await connection.execute(text("SELECT 1 FROM pos_schema_migrations WHERE version='003_pair_seeded_sales_staff'"))).first()
        if not applied:
            await connection.execute(text("""UPDATE users salesperson SET manager_id=manager.id
                FROM users manager, roles salesperson_role, roles manager_role
                WHERE salesperson.role_id=salesperson_role.id AND salesperson_role.code='SALES_PERSON'
                  AND manager.role_id=manager_role.id AND manager_role.code='SALES_MANAGER'
                  AND salesperson.branch_id=manager.branch_id AND salesperson.manager_id IS NULL
                  AND manager.employee_id=replace(salesperson.employee_id, 'POS-SP-', 'POS-SM-')"""))
            await connection.execute(text("INSERT INTO pos_schema_migrations(version) VALUES ('003_pair_seeded_sales_staff')"))
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
