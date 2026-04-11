# @vercel/python
"""Vercel Serverless Function — /api/health"""

from __future__ import annotations

from api._lib.base_handler import APIHandler
from api._lib.logic import NotFound


class handler(APIHandler):
    def route(self, method, path, query):
        if path == "/api/health" and method == "GET":
            return {"status": "ok", "service": "home-agent"}
        raise NotFound(f"no route: {method} {path}")
