"""Vercel Serverless Function — /api/scan/*"""

from __future__ import annotations

from api._lib import logic
from api._lib.base_handler import APIHandler
from api._lib.logic import NotFound


class handler(APIHandler):
    def route(self, method, path, query):
        if path == "/api/scan/barcode" and method == "POST":
            body = self._read_json()
            return logic.barcode_lookup(body.get("code"), body.get("format"))

        # OCR 은 🔒 준비중 스텁 응답만 — multipart 파싱 불필요
        if path == "/api/scan/product-image" and method == "POST":
            return logic.recognize_product_image(b"")

        if path == "/api/scan/receipt" and method == "POST":
            return logic.parse_receipt(b"")

        raise NotFound(f"no route: {method} {path}")
