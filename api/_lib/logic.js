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
  'name', 'brand', 'spec', 'max_stock',
  'current_stock', 'daily_usage', 'reorder_point',
]);
const UPDATE_FIELDS = new Set([
  'current_stock', 'daily_usage', 'reorder_point', 'last_ordered_at',
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
    if (CREATE_FIELDS.has(k) && v !== null && v !== undefined) {
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
