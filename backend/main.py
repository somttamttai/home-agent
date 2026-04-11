"""
home-agent FastAPI — 로컬 개발용 통합 엔트리포인트.
Vercel 배포에서는 api/*.py 가 각각 Serverless Function 으로 실행됨.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from api._lib.consumables_router import router as consumables_router  # noqa: E402
from api._lib.prices_router import router as prices_router  # noqa: E402
from api._lib.scan_router import router as scan_router  # noqa: E402
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

app.include_router(consumables_router, prefix="/api/consumables", tags=["consumables"])
app.include_router(prices_router,      prefix="/api/prices",      tags=["prices"])
app.include_router(scan_router,        prefix="/api/scan",        tags=["scan"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "home-agent"}


# 빌드된 프론트엔드 정적 서빙 (frontend/dist 가 있을 때)
dist_dir = ROOT / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
