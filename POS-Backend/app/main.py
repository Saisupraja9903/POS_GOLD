"""POS gateway; all transactions use the authoritative ERP service/database."""
import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

ERP_URL = os.getenv("ERP_API_URL", "http://erp-backend:8000/api/v1")
app = FastAPI(title="Jewellery POS API", version="1.0.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "pos-backend"}

@app.api_route("/api/v1/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway(path: str, request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() in {"authorization", "content-type", "x-request-id"}}
    async with httpx.AsyncClient(timeout=30) as client:
        upstream = await client.request(request.method, f"{ERP_URL}/{path}", params=request.query_params,
                                        content=await request.body(), headers=headers)
    return Response(upstream.content, status_code=upstream.status_code,
                    media_type=upstream.headers.get("content-type"))
