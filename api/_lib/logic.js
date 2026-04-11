// 프레임워크 무관 비즈니스 로직.
// api/*.js (Vercel Node.js Serverless Function) 에서 공유.

import * as naver from './naver.js';
import * as ocr from './ocr.js';
import * as supabase from './supabase.js';

export class NotFound extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFound';
  }
}

export class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequest';
  }
}

const CREATE_FIELDS = new Set([
  'name', 'brand', 'spec', 'category', 'max_stock',
  'current_stock', 'daily_usage', 'reorder_point',
]);
const UPDATE_FIELDS = new Set([
  'current_stock', 'daily_usage', 'reorder_point', 'last_ordered_at', 'category',
]);

function annotateStock(c) {
  const current = Number(c.current_stock) || 0;
  const daily = Number(c.daily_usage) || 0;
  const reorder = Number(c.reorder_point) || 0;

  let daysLeft = null;
  let depleteAt = null;
  let needReorder = false;

  if (daily > 0) {
    daysLeft = current / daily;
    depleteAt = new Date(Date.now() + daysLeft * 86400 * 1000).toISOString();
    needReorder = daysLeft <= reorder;
  }

  return {
    ...c,
    // Python round(x, 1) 에 해당
    days_left: daysLeft !== null ? Math.round(daysLeft * 10) / 10 : null,
    deplete_at: depleteAt,
    need_reorder: needReorder,
  };
}

// ── consumables ────────────────────────────────────────────────────────
export async function listConsumables() {
  const rows = await supabase.select('consumables', { order: 'id.asc' });
  return rows.map(annotateStock);
}

export async function createConsumable(body) {
  if (!body || !body.name) throw new BadRequest('name is required');
  const clean = {};
  for (const [k, v] of Object.entries(body)) {
    // 빈 문자열도 제외 → 컬럼의 DB default 가 적용되도록
    if (CREATE_FIELDS.has(k) && v !== null && v !== undefined && v !== '') {
      clean[k] = v;
    }
  }
  const row = await supabase.insert('consumables', clean);
  return annotateStock(row);
}

export async function getConsumable(cid) {
  const row = await supabase.getById('consumables', cid);
  if (!row) throw new NotFound('consumable not found');
  return annotateStock(row);
}

export async function updateConsumable(cid, body) {
  const patch = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (UPDATE_FIELDS.has(k) && v !== null && v !== undefined) {
      patch[k] = v;
    }
  }
  if (Object.keys(patch).length === 0) {
    throw new BadRequest('no updatable fields');
  }
  const rows = await supabase.update('consumables', { id: cid }, patch);
  if (!rows || rows.length === 0) throw new NotFound('consumable not found');
  return annotateStock(rows[0]);
}

export async function deleteConsumable(cid) {
  await supabase.del('consumables', { id: cid });
  return { ok: true };
}

export async function lowStockAlerts() {
  const rows = await supabase.select('consumables');
  return rows.map(annotateStock).filter((r) => r.need_reorder);
}

// ── prices ─────────────────────────────────────────────────────────────
export async function comparePrices(query, ply = null) {
  if (!query || query.length < 2) throw new BadRequest('query too short');
  let items = await naver.search(query, { display: 100, sort: 'sim' });
  if (ply != null) {
    items = items.filter((i) => i.specs.ply === ply);
  }
  const priced = items
    .filter((i) => i.unit_per_m != null && i.unit_per_m >= 1 && i.unit_per_m <= 1000)
    .sort((a, b) => a.unit_per_m - b.unit_per_m);
  return {
    query,
    total: items.length,
    valid: priced.length,
    cheapest: priced[0] || null,
    items: priced.slice(0, 20),
  };
}

export async function priceHistory(cid, limit = 50) {
  const consumable = await supabase.getById('consumables', cid);
  if (!consumable) throw new NotFound('consumable not found');
  const rows = await supabase.select('price_history', {
    consumable_id: `eq.${cid}`,
    order: 'checked_at.desc',
    limit: String(limit),
  });
  return { consumable, history: rows };
}

export async function refreshPrice(cid) {
  const consumable = await supabase.getById('consumables', cid);
  if (!consumable) throw new NotFound('consumable not found');

  // Python: int(spec.split("겹")[0].strip()[-1])
  let ply = null;
  const spec = consumable.spec || '';
  const gyopIdx = spec.indexOf('겹');
  if (gyopIdx >= 0) {
    const beforeGyop = spec.slice(0, gyopIdx).trim();
    const lastChar = beforeGyop.slice(-1);
    const parsed = parseInt(lastChar, 10);
    if (!Number.isNaN(parsed)) ply = parsed;
  }

  const best = await naver.findCheapest(consumable.name, ply);
  if (!best) throw new NotFound('no matching product found');

  const saved = await supabase.insert('price_history', {
    consumable_id: cid,
    mall_name: best.mall,
    price: best.price,
    unit_price_per_meter: best.unit_per_m,
    spec_parsed: best.specs,
  });
  return { saved, best };
}

// ── scan ───────────────────────────────────────────────────────────────
export async function barcodeLookup(code, format = null) {
  if (!code || code.length < 6) throw new BadRequest('invalid barcode');
  const items = await naver.search(code, { display: 20, sort: 'sim' });
  if (items.length === 0) {
    return { code, found: false, items: [] };
  }
  return {
    code,
    format,
    found: true,
    top: items[0],
    items: items.slice(0, 10),
  };
}

export function recognizeProductImage() {
  return ocr.recognizeProduct();
}

export function parseReceipt() {
  return ocr.parseReceipt();
}

// ── 쿠팡 주문내역 텍스트 파싱 ──────────────────────────────────────────
// ENABLE_OCR=true 면 Claude 호출, 아니면 단순 룰 기반 파서.
// `\b` 는 JS 정규식에서 Korean 문자(겹/롤/매/팩 등)에 작동하지 않음 (CJK 가 word char 아님).
// 그래서 영문/숫자가 바로 따라오는 경우만 차단하는 negative lookahead 로 대체.
const UNIT_RE = /(\d+(?:\.\d+)?)\s*(kg|ml|mL|g|L|l|롤|m|매|팩|개입|개|겹)(?![a-zA-Z])/gi;

function simpleParseLine(line) {
  const orig = String(line || '').trim();
  if (!orig) return null;

  let brand = '';
  let rest = orig;

  // [브랜드] 접두 패턴
  const bracket = orig.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracket) {
    brand = bracket[1].trim();
    rest = bracket[2].trim();
  } else {
    // 첫 단어를 브랜드로 추정
    const firstSpace = rest.indexOf(' ');
    if (firstSpace > 0) {
      brand = rest.slice(0, firstSpace);
      rest = rest.slice(firstSpace + 1).trim();
    }
  }

  // 규격 토큰 추출 (예: 30롤, 3kg, 3겹, 120g, 100매, 2팩, 3개입)
  const specTokens = [];
  let m;
  const pat = new RegExp(UNIT_RE.source, UNIT_RE.flags);
  while ((m = pat.exec(rest)) !== null) {
    specTokens.push(m[0].replace(/\s+/g, ''));
  }
  const spec = specTokens.join(' ');

  // 이름은 규격 토큰 제거한 나머지
  let name = rest;
  for (const s of specTokens) name = name.replace(s, '');
  name = name.replace(/\s+/g, ' ').trim();

  // 이름이 비었는데 brand 가 있으면 → brand 를 이름으로 승격 (브랜드 추정 실패)
  if (!name && brand) {
    name = brand;
    brand = '';
  }
  if (!name) name = orig;

  return { name, brand, spec, raw: orig };
}

export async function parseOrderText(text) {
  if (!text || typeof text !== 'string') {
    throw new BadRequest('text is required');
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new BadRequest('no content');

  // 1) Claude 시도 (ENABLE_OCR=true 일 때만 의미있는 결과)
  try {
    const claude = await ocr.parseOrderTextWithClaude(text);
    if (claude && claude.items && claude.items.length > 0) {
      return { parser: 'claude', items: claude.items };
    }
  } catch {
    // simple fallback 으로
  }

  // 2) Simple rule-based parser
  return {
    parser: 'simple',
    items: lines.map(simpleParseLine).filter(Boolean),
  };
}
