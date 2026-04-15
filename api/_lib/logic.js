// 프레임워크 무관 비즈니스 로직.
// api/*.js (Vercel Node.js Serverless Function) 에서 공유.
// service_role 키로 RLS 우회, 앱 레벨에서 household_id 필터링.

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
  'current_stock', 'daily_usage', 'reorder_point', 'household_id',
]);
const UPDATE_FIELDS = new Set([
  'name', 'brand', 'spec', 'category',
  'current_stock', 'max_stock', 'daily_usage', 'reorder_point', 'last_ordered_at',
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
    days_left: daysLeft !== null ? Math.round(daysLeft * 10) / 10 : null,
    deplete_at: depleteAt,
    need_reorder: needReorder,
  };
}

// ── consumables ────────────────────────────────────────────────────────
export async function listConsumables(householdId = null) {
  const params = { order: 'id.asc' };
  if (householdId) params.household_id = `eq.${householdId}`;
  const rows = await supabase.select('consumables', params);
  return rows.map(annotateStock);
}

export async function createConsumable(body) {
  if (!body || !body.name) throw new BadRequest('name is required');
  const clean = {};
  for (const [k, v] of Object.entries(body)) {
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
    if (!UPDATE_FIELDS.has(k)) continue;
    if (v === undefined) continue;
    if (k === 'name' && (v === null || v === '')) continue;
    patch[k] = v === '' ? null : v;
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

export async function lowStockAlerts(householdId = null) {
  const params = {};
  if (householdId) params.household_id = `eq.${householdId}`;
  const rows = await supabase.select('consumables', params);
  return rows.map(annotateStock).filter((r) => r.need_reorder);
}

// ── purchases ─────────────────────────────────────────────────────────
export async function createPurchase(body) {
  if (!body || !body.consumable_id) throw new BadRequest('consumable_id is required');
  const row = {
    household_id: body.household_id,
    consumable_id: body.consumable_id,
    purchased_at: body.purchased_at || new Date().toISOString(),
    days_before_depletion: body.days_before_depletion ?? null,
    purchase_type: body.purchase_type || 'normal',
    quantity: body.quantity ?? 1,
  };
  return await supabase.insert('purchase_history', row);
}

export async function getPurchaseHistory(consumableId, householdId = null) {
  const params = {
    consumable_id: `eq.${consumableId}`,
    order: 'purchased_at.desc',
  };
  if (householdId) params.household_id = `eq.${householdId}`;
  const rows = await supabase.select('purchase_history', params);

  let avgIntervalDays = null;
  let avgDaysBeforeDepletion = null;

  if (rows.length >= 2) {
    const sorted = [...rows].sort(
      (a, b) => new Date(a.purchased_at) - new Date(b.purchased_at),
    );
    let totalInterval = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].purchased_at) - new Date(sorted[i - 1].purchased_at);
      totalInterval += diff / (1000 * 60 * 60 * 24);
    }
    avgIntervalDays = Math.round((totalInterval / (sorted.length - 1)) * 10) / 10;
  }

  const withDepletion = rows.filter((r) => r.days_before_depletion != null);
  if (withDepletion.length > 0) {
    const sum = withDepletion.reduce((s, r) => s + Number(r.days_before_depletion), 0);
    avgDaysBeforeDepletion = Math.round((sum / withDepletion.length) * 10) / 10;
  }

  return {
    history: rows,
    stats: {
      total_purchases: rows.length,
      avg_interval_days: avgIntervalDays,
      avg_days_before_depletion: avgDaysBeforeDepletion,
    },
  };
}

export async function updatePurchaseType(purchaseId, purchaseType) {
  const valid = ['normal', 'event', 'gift', 'early'];
  if (!valid.includes(purchaseType)) throw new BadRequest('invalid purchase_type');
  const rows = await supabase.update('purchase_history', { id: purchaseId }, { purchase_type: purchaseType });
  if (!rows || rows.length === 0) throw new NotFound('purchase not found');
  return rows[0];
}

// ── prices ─────────────────────────────────────────────────────────────
// 배송비 불명 시 보수적 추정값
const ASSUMED_SHIPPING = 3000;

function sortTotal(a, b) {
  const aTotal = a.price + (a.shipping ?? ASSUMED_SHIPPING);
  const bTotal = b.price + (b.shipping ?? ASSUMED_SHIPPING);
  return aTotal - bTotal;
}

export async function comparePrices(query, ply = null) {
  if (!query || query.length < 2) throw new BadRequest('query too short');
  let items = await naver.search(query, { display: 100, sort: 'sim' });
  if (ply != null) {
    items = items.filter((i) => i.specs.ply === ply);
  }

  const withUnit = items
    .filter((i) => i.unit_price != null && i.unit_price > 0)
    .sort(sortTotal);

  if (withUnit.length > 0) {
    return {
      query,
      total: items.length,
      valid: withUnit.length,
      sorted_by: 'total',
      cheapest: withUnit[0],
      items: withUnit.slice(0, 20),
    };
  }

  const byTotal = [...items].sort(sortTotal);
  return {
    query,
    total: items.length,
    valid: 0,
    sorted_by: 'total',
    cheapest: byTotal[0] || null,
    items: byTotal.slice(0, 20),
    unit_price_unavailable: true,
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

  const phRow = {
    consumable_id: cid,
    mall_name: best.mall,
    price: best.price,
    unit_price_per_meter: best.unit_price,
    spec_parsed: {
      ...best.specs,
      unit: best.unit,
      total_size: best.total_size,
    },
  };
  if (consumable.household_id) phRow.household_id = consumable.household_id;
  const saved = await supabase.insert('price_history', phRow);
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

const UNIT_RE = /(\d+(?:\.\d+)?)\s*(kg|ml|mL|g|L|l|롤|m|매|팩|개입|개|겹)(?![a-zA-Z])/gi;

function simpleParseLine(line) {
  const orig = String(line || '').trim();
  if (!orig) return null;

  let brand = '';
  let rest = orig;

  const bracket = orig.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracket) {
    brand = bracket[1].trim();
    rest = bracket[2].trim();
  } else {
    const firstSpace = rest.indexOf(' ');
    if (firstSpace > 0) {
      brand = rest.slice(0, firstSpace);
      rest = rest.slice(firstSpace + 1).trim();
    }
  }

  const specTokens = [];
  let m;
  const pat = new RegExp(UNIT_RE.source, UNIT_RE.flags);
  while ((m = pat.exec(rest)) !== null) {
    specTokens.push(m[0].replace(/\s+/g, ''));
  }
  const spec = specTokens.join(' ');

  let name = rest;
  for (const s of specTokens) name = name.replace(s, '');
  name = name.replace(/\s+/g, ' ').trim();

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

  try {
    const claude = await ocr.parseOrderTextWithClaude(text);
    if (claude && claude.items && claude.items.length > 0) {
      return { parser: 'claude', items: claude.items };
    }
  } catch {
    // simple fallback
  }

  return {
    parser: 'simple',
    items: lines.map(simpleParseLine).filter(Boolean),
  };
}
