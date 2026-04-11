"""바코드 스캔 → 네이버 검색 / OCR (준비중)."""

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from . import naver, ocr

router = APIRouter()


class BarcodeIn(BaseModel):
    code: str
    format: str | None = None  # EAN_13, UPC_A 등


@router.post("/barcode")
def barcode_lookup(body: BarcodeIn):
    """
    바코드 번호로 네이버 쇼핑 검색.
    한국 네이버 API 는 바코드 직접조회가 없으므로, 바코드 문자열 자체를 query 로 검색.
    """
    if not body.code or len(body.code) < 6:
        raise HTTPException(400, "invalid barcode")

    items = naver.search(body.code, display=20, sort="sim")
    if not items:
        return {"code": body.code, "found": False, "items": []}

    top = items[0]
    return {
        "code": body.code,
        "format": body.format,
        "found": True,
        "top": top,
        "items": items[:10],
    }


@router.post("/product-image")
async def product_image(file: UploadFile = File(...)):
    """상품 사진 인식 — 🔒 준비중 (Claude AI 비용 절감)."""
    data = await file.read()
    return ocr.recognize_product(data)


@router.post("/receipt")
async def receipt(file: UploadFile = File(...)):
    """영수증 인식 — 🔒 준비중."""
    data = await file.read()
    return ocr.parse_receipt(data)
