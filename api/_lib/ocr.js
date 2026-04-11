// Claude Vision OCR — 🔒 준비중 스텁. 비용 절감을 위해 기본 비활성화.
// ENABLE_OCR=true 로 설정하면 아래 실제 호출부를 구현하면 됨.

function enabled() {
  return (process.env.ENABLE_OCR || 'false').toLowerCase() === 'true';
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
