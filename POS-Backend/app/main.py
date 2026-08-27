"""POS gateway; all transactions use the authoritative ERP service/database."""
import os
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from argon2 import PasswordHasher
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from fastapi.middleware.cors import CORSMiddleware

ERP_URL = os.getenv("ERP_API_URL", "http://erp-backend:8000/api/v1")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@postgres:5432/jewellery_erp")
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
password_hasher = PasswordHasher()

class StaffCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    employee_id: str = Field(min_length=1, max_length=64)
    phone: str = Field(pattern=r"^[6-9][0-9]{9}$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role_code: str

class StaffUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    employee_id: str | None = Field(default=None, min_length=1, max_length=64)
    phone: str | None = Field(default=None, pattern=r"^[6-9][0-9]{9}$")
    email: EmailStr | None = None
app = FastAPI(title="Jewellery POS API", version="1.0.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# POS-only supervisory policy. The upstream ERP permission set is intentionally
# left unchanged because it is shared with the ERP application.
BRANCH_MANAGER_BLOCKED = (
    ("POST", "pos/cart"), ("PATCH", "pos/cart"), ("DELETE", "pos/cart"),
    ("POST", "customers"), ("POST", "sales"), ("POST", "pos/returns"),
    ("POST", "pos/items/lookup"), ("POST", "pos/products"),
    ("POST", "pos/old-gold-buybacks"),
)

def branch_manager_operation_blocked(method: str, path: str) -> bool:
    clean_path = path.strip("/")
    return any(method.upper() == blocked_method and
               (clean_path == prefix or clean_path.startswith(f"{prefix}/"))
               for blocked_method, prefix in BRANCH_MANAGER_BLOCKED)

async def current_pos_role(client: httpx.AsyncClient, headers: dict[str, str]) -> str | None:
    if "authorization" not in headers:
        return None
    response = await client.get(f"{ERP_URL}/auth/me", headers=headers)
    if response.status_code != 200:
        return None
    return response.json().get("role", {}).get("code")

async def current_pos_user(client: httpx.AsyncClient, headers: dict[str, str]) -> dict | None:
    if "authorization" not in headers:
        return None
    response = await client.get(f"{ERP_URL}/auth/me", headers=headers)
    return response.json() if response.status_code == 200 else None

async def require_team_manager(request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() == "authorization"}
    async with httpx.AsyncClient(timeout=30) as client:
        user = await current_pos_user(client, headers)
    if not user:
        return None, JSONResponse(status_code=401, content={"error": {"code": "NOT_AUTHENTICATED", "message": "Authentication required."}})
    if user.get("role", {}).get("code") not in {"BRANCH_MANAGER", "SALES_MANAGER"} or not user.get("branch_id"):
        return None, JSONResponse(status_code=403, content={"error": {"code": "POS_TEAM_FORBIDDEN", "message": "Team manager access is required."}})
    return user, None

@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "pos-backend"}

@app.get("/api/v1/pos/team")
async def branch_team(request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() == "authorization"}
    async with httpx.AsyncClient(timeout=30) as client:
        user = await current_pos_user(client, headers)
    if not user:
        return JSONResponse(status_code=401, content={"error": {"code": "NOT_AUTHENTICATED", "message": "Authentication required."}})
    if user.get("role", {}).get("code") not in {"BRANCH_MANAGER", "SALES_MANAGER"}:
        return JSONResponse(status_code=403, content={"error": {"code": "POS_TEAM_FORBIDDEN", "message": "Team access is restricted to branch managers."}})
    branch_id = user.get("branch_id")
    if not branch_id:
        return []
    is_sales_manager = user.get("role", {}).get("code") == "SALES_MANAGER"
    query = text("""SELECT u.id, u.full_name, u.email, u.employee_id, u.phone, u.is_active, u.manager_id,
                           r.code AS role_code, r.name AS role_name
                    FROM users u JOIN roles r ON r.id = u.role_id
                    WHERE u.branch_id = CAST(:branch_id AS uuid)
                      AND ((:sales_manager=false AND r.code IN ('BRANCH_MANAGER','SALES_MANAGER','SALES_PERSON'))
                           OR (:sales_manager=true AND r.code='SALES_PERSON' AND u.manager_id=CAST(:manager_id AS uuid)))
                    ORDER BY CASE r.code WHEN 'BRANCH_MANAGER' THEN 1 WHEN 'SALES_MANAGER' THEN 2 ELSE 3 END,
                             u.full_name""")
    async with engine.connect() as connection:
        rows = (await connection.execute(query, {"branch_id": branch_id, "sales_manager": is_sales_manager, "manager_id": user.get("id")})).mappings().all()
    return [{**dict(row), "id": str(row["id"]), "manager_id": str(row["manager_id"]) if row["manager_id"] else None} for row in rows]

@app.post("/api/v1/pos/team", status_code=201)
async def create_branch_staff(body: StaffCreate, request: Request):
    user, error = await require_team_manager(request)
    if error: return error
    role_code = body.role_code.upper()
    is_sales_manager = user["role"]["code"] == "SALES_MANAGER"
    allowed_roles = {"SALES_PERSON"} if is_sales_manager else {"SALES_MANAGER", "SALES_PERSON"}
    if role_code not in allowed_roles:
        return JSONResponse(status_code=403, content={"error": {"code": "ROLE_NOT_ALLOWED", "message": "This role cannot be created by the current manager."}})
    async with engine.begin() as connection:
        duplicate = (await connection.execute(text("SELECT 1 FROM users WHERE lower(email)=lower(:email) OR upper(employee_id)=upper(:employee_id)"), {"email": str(body.email), "employee_id": body.employee_id})).first()
        if duplicate:
            return JSONResponse(status_code=409, content={"error": {"code": "STAFF_EXISTS", "message": "Email or employee ID already exists."}})
        role_id = (await connection.execute(text("SELECT id FROM roles WHERE code=:role"), {"role": role_code})).scalar_one_or_none()
        if not role_id:
            return JSONResponse(status_code=422, content={"error": {"code": "ROLE_NOT_FOUND", "message": "Selected role is unavailable."}})
        row = (await connection.execute(text("""INSERT INTO users (id,email,employee_id,phone,full_name,hashed_password,is_active,role_id,branch_id,manager_id,created_at,updated_at)
            VALUES (:id,lower(:email),upper(:employee_id),:phone,:full_name,:password,true,:role_id,CAST(:branch_id AS uuid),CAST(:manager_id AS uuid),now(),now())
            RETURNING id"""), {"id": uuid.uuid4(), "email": str(body.email), "employee_id": body.employee_id, "phone": body.phone, "full_name": body.full_name.strip(), "password": password_hasher.hash(body.password), "role_id": role_id, "branch_id": user["branch_id"], "manager_id": user["id"] if is_sales_manager else None})).scalar_one()
    return {"id": str(row), "message": "Staff member created."}

@app.patch("/api/v1/pos/team/{staff_id}")
async def update_branch_staff(staff_id: uuid.UUID, body: StaffUpdate, request: Request):
    user, error = await require_team_manager(request)
    if error: return error
    values = body.model_dump(exclude_none=True)
    if not values: return {"message": "No changes supplied."}
    is_sales_manager = user["role"]["code"] == "SALES_MANAGER"
    assignments = []; params = {"staff_id": staff_id, "branch_id": user["branch_id"], "manager_id": user["id"], "sales_manager": is_sales_manager}
    for field, value in values.items():
        assignments.append(f"{field}=:{field}"); params[field] = str(value).lower() if field == "email" else value
    async with engine.begin() as connection:
        result = await connection.execute(text(f"""UPDATE users SET {','.join(assignments)},updated_at=now() WHERE id=:staff_id
            AND branch_id=CAST(:branch_id AS uuid)
            AND ((:sales_manager=false AND role_id IN (SELECT id FROM roles WHERE code IN ('SALES_MANAGER','SALES_PERSON')))
                 OR (:sales_manager=true AND manager_id=CAST(:manager_id AS uuid) AND role_id=(SELECT id FROM roles WHERE code='SALES_PERSON')))
            RETURNING id"""), params)
        if not result.scalar_one_or_none():
            return JSONResponse(status_code=403, content={"error": {"code": "STAFF_OUTSIDE_BRANCH", "message": "This employee cannot be managed."}})
    return {"message": "Staff member updated."}

@app.post("/api/v1/pos/team/{staff_id}/{action}")
async def set_branch_staff_status(staff_id: uuid.UUID, action: str, request: Request):
    user, error = await require_team_manager(request)
    if error: return error
    if action not in {"enable", "disable"}:
        return JSONResponse(status_code=404, content={"error": {"code": "UNKNOWN_ACTION", "message": "Unknown staff action."}})
    async with engine.begin() as connection:
        is_sales_manager = user["role"]["code"] == "SALES_MANAGER"
        result = await connection.execute(text("""UPDATE users SET is_active=:active,updated_at=now() WHERE id=:staff_id
            AND branch_id=CAST(:branch_id AS uuid)
            AND ((:sales_manager=false AND role_id IN (SELECT id FROM roles WHERE code IN ('SALES_MANAGER','SALES_PERSON')))
                 OR (:sales_manager=true AND manager_id=CAST(:manager_id AS uuid) AND role_id=(SELECT id FROM roles WHERE code='SALES_PERSON')))
            RETURNING id"""), {"active": action == "enable", "staff_id": staff_id, "branch_id": user["branch_id"], "manager_id": user["id"], "sales_manager": is_sales_manager})
        if not result.scalar_one_or_none():
            return JSONResponse(status_code=403, content={"error": {"code": "STAFF_OUTSIDE_BRANCH", "message": "This employee cannot be managed."}})
    return {"message": f"Staff member {action}d."}

@app.delete("/api/v1/pos/team/{staff_id}")
async def delete_branch_staff(staff_id: uuid.UUID, request: Request):
    user, error = await require_team_manager(request)
    if error: return error
    is_sales_manager = user["role"]["code"] == "SALES_MANAGER"
    async with engine.begin() as connection:
        target = (await connection.execute(text("""SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=:staff_id
            AND u.branch_id=CAST(:branch_id AS uuid)
            AND ((:sales_manager=false AND r.code IN ('SALES_MANAGER','SALES_PERSON'))
                 OR (:sales_manager=true AND r.code='SALES_PERSON' AND u.manager_id=CAST(:manager_id AS uuid)))"""),
            {"staff_id": staff_id, "branch_id": user["branch_id"], "manager_id": user["id"], "sales_manager": is_sales_manager})).scalar_one_or_none()
        if not target:
            return JSONResponse(status_code=403, content={"error": {"code": "STAFF_OUTSIDE_BRANCH", "message": "This employee cannot be managed."}})
        if is_sales_manager:
            await connection.execute(text("UPDATE users SET is_active=false,updated_at=now() WHERE id=:staff_id"), {"staff_id": staff_id})
            return Response(status_code=204)
        used = (await connection.execute(text("SELECT 1 FROM sales WHERE salesperson_id=:staff_id LIMIT 1"), {"staff_id": staff_id})).first()
        if used:
            return JSONResponse(status_code=409, content={"error": {"code": "STAFF_HAS_HISTORY", "message": "This employee has sales history and must be disabled instead of deleted."}})
        await connection.execute(text("DELETE FROM refresh_tokens WHERE user_id=:staff_id"), {"staff_id": staff_id})
        try:
            async with connection.begin_nested():
                await connection.execute(text("DELETE FROM users WHERE id=:staff_id"), {"staff_id": staff_id})
        except Exception:
            return JSONResponse(status_code=409, content={"error": {"code": "STAFF_HAS_HISTORY", "message": "This employee is referenced by history and must be disabled instead."}})
    return Response(status_code=204)

@app.get("/api/v1/pos/dashboard/summary")
async def pos_dashboard_summary(request: Request, period: str = "TODAY"):
    headers = {k: v for k, v in request.headers.items() if k.lower() == "authorization"}
    async with httpx.AsyncClient(timeout=30) as client:
        user = await current_pos_user(client, headers)
    if not user:
        return JSONResponse(status_code=401, content={"error": {"code": "NOT_AUTHENTICATED", "message": "Authentication required."}})
    branch_id = user.get("branch_id")
    if not branch_id:
        return JSONResponse(status_code=403, content={"error": {"code": "BRANCH_REQUIRED", "message": "A branch assignment is required."}})
    period = period.upper()
    india = ZoneInfo("Asia/Kolkata")
    today = datetime.now(india).replace(hour=0, minute=0, second=0, microsecond=0)
    bounds = {"TODAY": (today, today + timedelta(days=1)), "YESTERDAY": (today - timedelta(days=1), today),
              "LAST_WEEK": (today - timedelta(days=7), today + timedelta(days=1)),
              "LAST_MONTH": (today - timedelta(days=30), today + timedelta(days=1)), "ALL": (None, None)}
    if period not in bounds:
        return JSONResponse(status_code=422, content={"error": {"code": "INVALID_PERIOD", "message": "Unsupported dashboard period."}})
    start, end = bounds[period]
    date_filter = "" if start is None else "AND i.invoice_date >= :start AND i.invoice_date < :end"
    params = {"branch_id": branch_id, "start": start.astimezone(timezone.utc) if start else None, "end": end.astimezone(timezone.utc) if end else None}
    sales_query = text(f"""SELECT COUNT(i.id) bills, COALESCE(SUM(i.total),0) revenue FROM invoices i
                            JOIN sales s ON s.id=i.sale_id WHERE i.branch_id=CAST(:branch_id AS uuid)
                            AND i.source='POS' AND s.status='CONFIRMED' {date_filter}""")
    weights_query = text(f"""SELECT COALESCE(SUM(j.gross_weight),0) gross_weight,
                               COALESCE(SUM(j.net_weight),0) net_weight, COALESCE(SUM(j.stone_weight),0) stone_weight,
                               COALESCE(SUM(j.fine_weight),0) fine_weight, COUNT(si.id) pieces FROM invoices i
                               JOIN sales s ON s.id=i.sale_id JOIN sale_items si ON si.sale_id=s.id
                               JOIN jewellery_items j ON j.id=si.item_id WHERE i.branch_id=CAST(:branch_id AS uuid)
                               AND i.source='POS' AND s.status='CONFIRMED' {date_filter}""")
    async with engine.connect() as connection:
        sales = (await connection.execute(sales_query, params)).mappings().one()
        weights = (await connection.execute(weights_query, params)).mappings().one()
    return {"period": period, "bills": sales["bills"], "revenue": str(sales["revenue"]), "pieces": weights["pieces"],
            "gross_weight": str(weights["gross_weight"]), "net_weight": str(weights["net_weight"]),
            "stone_weight": str(weights["stone_weight"]), "fine_weight": str(weights["fine_weight"])}

@app.api_route("/api/v1/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway(path: str, request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() in {"authorization", "content-type", "x-request-id"}}
    async with httpx.AsyncClient(timeout=30) as client:
        if branch_manager_operation_blocked(request.method, path):
            role = await current_pos_role(client, headers)
            if role in {"BRANCH_MANAGER", "SALES_MANAGER"}:
                return JSONResponse(status_code=403, content={"error": {
                    "code": "POS_SUPERVISORY_ROLE",
                    "message": "Managers can monitor branch activity but cannot perform counter operations.",
                }})
        upstream = await client.request(request.method, f"{ERP_URL}/{path}", params=request.query_params,
                                        content=await request.body(), headers=headers)
    return Response(upstream.content, status_code=upstream.status_code,
                    media_type=upstream.headers.get("content-type"))
