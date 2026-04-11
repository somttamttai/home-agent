"""Vercel Serverless Function — /api/prices/*"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api._lib.prices_router import router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix="/api/prices")
