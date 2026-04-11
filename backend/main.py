"""
home-agent FastAPI — 로컬 개발용 통합 엔트리포인트.
Vercel 배포에서는 api/*.py (BaseHTTPRequestHandler) 가 각각 Serverless Function 으로 실행됨.
이 파일은 Vercel 에 배포되지 않으며, fastapi 는 로컬 .venv 에만 설치되어 있으면 됨.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from fastapi import FastAPI, HTTPException, Query, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from backend._lib import logic  # noqa: E402
from backend._lib.logic import BadRequest, NotFound  # noqa: E402
from backend.scheduler import start_scheduler, stop_scheduler  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="home-agent", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _run(fn):
    try:
        return fn()
    except BadRequest as e:
        raise HTTPException(400, str(e))
    except NotFound as e:
        raise HTTPException(404, str(e))


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "home-agent"}


# ── consumables ─────────────────────────────────────────────────────────
@app.get("/api/consumables")
def list_consumables():
    return logic.list_consumables()


@app.post("/api/consumables")
async def create_consumable(req: Request):
    body = await req.json()
    return _run(lambda: logic.create_consumable(body))


@app.get("/api/consumables/alerts/low-stock")
def low_stock():
    return logic.low_stock_alerts()


@app.get("/api/consumables/{cid}")
def get_consumable(cid: int):
    return _run(lambda: logic.get_consumable(cid))


@app.patch("/api/consumables/{cid}")
async def update_consumable(cid: int, req: Request):
    body = await req.json()
    return _run(lambda: logic.update_consumable(cid, body))


@app.delete("/api/consumables/{cid}")
def delete_consumable(cid: int):
    return logic.delete_consumable(cid)


# ── prices ──────────────────────────────────────────────────────────────
@app.get("/api/prices/compare")
def compare(query: str = Query(..., min_length=2), ply: int | None = None):
    return _run(lambda: logic.compare_prices(query, ply))


@app.get("/api/prices/history/{cid}")
def history(cid: int, limit: int = 50):
    return _run(lambda: logic.price_history(cid, limit))


@app.post("/api/prices/refresh/{cid}")
def refresh(cid: int):
    return _run(lambda: logic.refresh_price(cid))


# ── scan ────────────────────────────────────────────────────────────────
@app.post("/api/scan/barcode")
async def barcode(req: Request):
    body = await req.json()
    return _run(lambda: logic.barcode_lookup(body.get("code"), body.get("format")))


@app.post("/api/scan/product-image")
def product_image():
    return logic.recognize_product_image(b"")


@app.post("/api/scan/receipt")
def receipt():
    return logic.parse_receipt(b"")


# ── 빌드된 프론트엔드 정적 서빙 ────────────────────────────────────────
dist_dir = ROOT / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
