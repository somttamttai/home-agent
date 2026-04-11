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


def parse_order_text_enabled() -> bool:
    return ENABLE_OCR


def parse_order_text_with_claude(text: str) -> dict:
    """ENABLE_OCR=true 일 때만 실제 호출. 현재는 stub."""
    if not ENABLE_OCR:
        return {"parser": "simple", "items": None}
    # TODO: Claude API 호출
    # import anthropic
    # client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    # msg = client.messages.create(
    #     model="claude-sonnet-4-6",
    #     max_tokens=1024,
    #     messages=[{
    #         "role": "user",
    #         "content": (
    #             "다음 쿠팡 주문내역에서 각 라인의 브랜드/제품명/규격을 "
    #             "JSON 배열 [{name, brand, spec}, ...] 로만 추출:\n" + text
    #         ),
    #     }],
    # )
    # import json
    # return {"parser": "claude", "items": json.loads(msg.content[0].text)}
    return {"parser": "simple", "items": None}
