"""
Claude Vision 기반 OCR 서비스.
비용 절감을 위해 기본 비활성화 (ENABLE_OCR=false).
프론트엔드에서는 🔒 '준비중' 표시로 노출.
"""

import os

ENABLE_OCR = os.environ.get("ENABLE_OCR", "false").lower() == "true"


def is_enabled() -> bool:
    return ENABLE_OCR


def recognize_product(image_bytes: bytes) -> dict:
    """상품 사진 → 브랜드/제품명/스펙 인식."""
    if not ENABLE_OCR:
        return {
            "enabled": False,
            "message": "🔒 상품 인식 기능은 준비중입니다.",
        }

    # import base64
    # import anthropic
    # client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    # b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    # msg = client.messages.create(
    #     model="claude-sonnet-4-6",
    #     max_tokens=512,
    #     messages=[{
    #         "role": "user",
    #         "content": [
    #             {"type": "image", "source": {
    #                 "type": "base64", "media_type": "image/jpeg", "data": b64}},
    #             {"type": "text",
    #              "text": "이 상품 사진에서 브랜드, 제품명, 스펙(용량/수량)을 JSON으로 반환"},
    #         ],
    #     }],
    # )
    # return {"enabled": True, "result": msg.content[0].text}
    return {"enabled": False, "message": "Not implemented"}


def parse_receipt(image_bytes: bytes) -> dict:
    """영수증 사진 → 구매 품목/가격/쇼핑몰 추출."""
    if not ENABLE_OCR:
        return {
            "enabled": False,
            "message": "🔒 영수증 인식 기능은 준비중입니다.",
        }

    # import base64
    # import anthropic
    # client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    # b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    # msg = client.messages.create(
    #     model="claude-sonnet-4-6",
    #     max_tokens=1024,
    #     messages=[{
    #         "role": "user",
    #         "content": [
    #             {"type": "image", "source": {
    #                 "type": "base64", "media_type": "image/jpeg", "data": b64}},
    #             {"type": "text",
    #              "text": "영수증에서 판매처, 각 품목의 이름/수량/단가/금액을 JSON으로 반환"},
    #         ],
    #     }],
    # )
    # return {"enabled": True, "items": msg.content[0].text}
    return {"enabled": False, "message": "Not implemented"}
