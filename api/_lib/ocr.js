// Claude Vision OCR — 🔒 준비중 스텁. 비용 절감을 위해 기본 비활성화.
// ENABLE_OCR=true 로 설정하면 아래 실제 호출부를 구현하면 됨.

function enabled() {
  return (process.env.ENABLE_OCR || 'false').toLowerCase() === 'true';
}

export function parseOrderTextEnabled() {
  return enabled();
}

// Claude API 연동부 — ENABLE_OCR=true 일 때만 실제 호출.
// 현재는 stub 으로 null 을 리턴 → logic.parseOrderText 가 simple parser fallback.
export async function parseOrderTextWithClaude(/* text */) {
  if (!enabled()) {
    return { parser: 'simple', items: null };
  }
  // TODO: Claude API 호출
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const msg = await client.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   max_tokens: 1024,
  //   messages: [{
  //     role: 'user',
  //     content: '다음 쿠팡 주문내역에서 각 라인의 브랜드/제품명/규격을 ' +
  //              'JSON 배열 [{name, brand, spec}, ...] 로만 추출:\n' + text,
  //   }],
  // });
  // const parsed = JSON.parse(msg.content[0].text);
  // return { parser: 'claude', items: parsed };
  return { parser: 'simple', items: null };
}

export function recognizeProduct(/* imageBytes */) {
  if (!enabled()) {
    return { enabled: false, message: '🔒 상품 인식 기능은 준비중입니다.' };
  }
  // TODO: Claude API 호출
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic();
  // const msg = await client.messages.create({ model: 'claude-sonnet-4-6', ... });
  return { enabled: false, message: 'Not implemented' };
}

export function parseReceipt(/* imageBytes */) {
  if (!enabled()) {
    return { enabled: false, message: '🔒 영수증 인식 기능은 준비중입니다.' };
  }
  return { enabled: false, message: 'Not implemented' };
}
