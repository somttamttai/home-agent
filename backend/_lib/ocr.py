"""Claude Vision OCR 스텁 (준비중)."""

import os

ENABLE_OCR = os.environ.get("ENABLE_OCR", "false").lower() == "true"


def is_enabled() -> bool:
    return ENABLE_OCR


def recognize_product(image_bytes: bytes) -> dict:
    if not ENABLE_OCR:
        return {"enabled": False, "message": "🔒 상품 인식 기능은 준비중입니다."}
    return {"enabled": False, "message": "Not implemented"}


def parse_receipt(image_bytes: bytes) -> dict:
    if not ENABLE_OCR:
        return {"enabled": False, "message": "🔒 영수증 인식 기능은 준비중입니다."}
    return {"enabled": False, "message": "Not implemented"}
