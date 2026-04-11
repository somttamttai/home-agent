// 로컬 검증 하네스: api/*.js 핸들러를 실제 req/res 없이 호출
// 사용: node --env-file=.env scripts/test-api.mjs

import health   from '../api/health.js';
import consumables from '../api/consumables.js';
import prices   from '../api/prices.js';
import scan     from '../api/scan.js';

function mockReq({ method, url, body, headers = {} }) {
  return {
    method,
    url,
    body,
    headers: { host: 'localhost', ...headers },
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _body: undefined,
    writableEnded: false,
    setHeader(name, value) { this._headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this._body = data; this.writableEnded = true; return this; },
    end() { this.writableEnded = true; return this; },
  };
  return res;
}

async function call(handler, req) {
  const res = mockRes();
  await handler(mockReq(req), res);
  return { status: res.statusCode, body: res._body };
}

function ok(name, cond, extra = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`${mark} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

// ── 1. GET /api/health ─────────────────────────────────────────────────
{
  const { status, body } = await call(health, {
    method: 'GET', url: '/api/health',
  });
  ok('health',
    status === 200 && body.status === 'ok' && body.service === 'home-agent',
    `status=${status}`,
  );
}

// ── 2. GET /api/consumables ────────────────────────────────────────────
let firstId;
{
  const { status, body } = await call(consumables, {
    method: 'GET', url: '/api/consumables',
  });
  ok('list consumables',
    status === 200 && Array.isArray(body),
    `status=${status}, count=${Array.isArray(body) ? body.length : 'N/A'}`,
  );
  if (Array.isArray(body) && body[0]) {
    firstId = body[0].id;
    console.log(`   first: id=${body[0].id}, name=${body[0].name}, days_left=${body[0].days_left}, need_reorder=${body[0].need_reorder}`);
  }
}

// ── 3. POST /api/consumables (create) ──────────────────────────────────
let tmpId;
{
  const { status, body } = await call(consumables, {
    method: 'POST',
    url: '/api/consumables',
    body: {
      name: 'TEST_JS 휴지',
      brand: '테스트브랜드',
      spec: '3겹 30m',
      max_stock: 30,
      current_stock: 20,
      daily_usage: 0.5,
      reorder_point: 7,
    },
  });
  ok('create consumable',
    status === 200 && body.id && body.name === 'TEST_JS 휴지' && body.days_left === 40,
    `status=${status}, id=${body?.id}, days_left=${body?.days_left}`,
  );
  tmpId = body?.id;
}

// ── 4. PATCH /api/consumables/{id} ─────────────────────────────────────
if (tmpId) {
  const { status, body } = await call(consumables, {
    method: 'PATCH',
    url: `/api/consumables/${tmpId}`,
    body: { current_stock: 15 },
  });
  ok('patch consumable',
    status === 200 && Number(body?.current_stock) === 15 && body?.days_left === 30,
    `status=${status}, current_stock=${body?.current_stock}, days_left=${body?.days_left}`,
  );
}

// ── 5. GET /api/prices/compare (m unit — tissue) ───────────────────────
{
  const q = encodeURIComponent('크리넥스 3겹 30m');
  const { status, body } = await call(prices, {
    method: 'GET', url: `/api/prices/compare?query=${q}&ply=3`,
  });
  const cheapest = body?.cheapest;
  ok('prices compare (m unit)',
    status === 200 && body?.total > 0 && cheapest?.unit_price > 0 && cheapest?.unit === 'm',
    `sorted_by=${body?.sorted_by}, valid=${body?.valid}, cheapest=${cheapest?.price}원 ${cheapest?.unit_price}원/${cheapest?.unit}`,
  );
}

// ── 5b. GET /api/prices/compare (ml unit — shampoo) ────────────────────
{
  const q = encodeURIComponent('팬틴 샴푸');
  const { status, body } = await call(prices, {
    method: 'GET', url: `/api/prices/compare?query=${q}`,
  });
  const cheapest = body?.cheapest;
  ok('prices compare (ml unit)',
    status === 200 && cheapest?.unit_price > 0 && cheapest?.unit === 'ml',
    `cheapest=${cheapest?.price}원 ${cheapest?.unit_price}원/${cheapest?.unit}`,
  );
}

// ── 5c. GET /api/prices/compare (매 unit — zipper bag) ─────────────────
{
  const q = encodeURIComponent('지퍼백');
  const { status, body } = await call(prices, {
    method: 'GET', url: `/api/prices/compare?query=${q}`,
  });
  const cheapest = body?.cheapest;
  ok('prices compare (매 unit)',
    status === 200 && cheapest?.unit_price > 0 && cheapest?.unit === '매',
    `cheapest=${cheapest?.price}원 ${cheapest?.unit_price}원/${cheapest?.unit}`,
  );
}

// ── 6. GET /api/consumables/alerts/low-stock ───────────────────────────
{
  const { status, body } = await call(consumables, {
    method: 'GET', url: '/api/consumables/alerts/low-stock',
  });
  ok('low stock alerts',
    status === 200 && Array.isArray(body),
    `status=${status}, alerts=${Array.isArray(body) ? body.length : 'N/A'}`,
  );
}

// ── 7. GET /api/consumables/{firstId} (기존 row 검증) ──────────────────
if (firstId) {
  const { status, body } = await call(consumables, {
    method: 'GET', url: `/api/consumables/${firstId}`,
  });
  ok('get consumable by id',
    status === 200 && body?.id === firstId,
    `id=${body?.id}, name=${body?.name}`,
  );
}

// ── 8. scan barcode (JSON body) ────────────────────────────────────────
{
  const { status, body } = await call(scan, {
    method: 'POST',
    url: '/api/scan/barcode',
    body: { code: '8801006028829', format: 'EAN_13' },
  });
  ok('scan barcode',
    status === 200 && 'found' in body,
    `found=${body?.found}, top=${body?.top?.mall || '-'}`,
  );
}

// ── 9. scan product-image (🔒 stub) ────────────────────────────────────
{
  const { status, body } = await call(scan, {
    method: 'POST', url: '/api/scan/product-image',
  });
  ok('scan product-image stub',
    status === 200 && body?.enabled === false,
    `message=${body?.message}`,
  );
}

// ── 10. DELETE temp row (cleanup) ──────────────────────────────────────
if (tmpId) {
  const { status, body } = await call(consumables, {
    method: 'DELETE', url: `/api/consumables/${tmpId}`,
  });
  ok('delete temp row',
    status === 200 && body?.ok === true,
    `id=${tmpId}`,
  );
}

// ── 11b. POST /api/scan/parse-text (쿠팡 붙여넣기 파서) ────────────────
{
  const text = `[크리넥스] 순수 소프트 화장지 3겹 30m 30롤 2팩
피죤 세탁세제 드럼 3kg
2080 치약 120g 3개입`
  const { status, body } = await call(scan, {
    method: 'POST',
    url: '/api/scan/parse-text',
    body: { text },
  })
  ok('parse-text simple parser',
    status === 200 &&
      body?.parser === 'simple' &&
      Array.isArray(body?.items) &&
      body.items.length === 3 &&
      body.items[0].brand === '크리넥스' &&
      body.items[1].brand === '피죤' &&
      body.items[1].spec === '3kg' &&
      body.items[2].brand === '2080',
    `parser=${body?.parser}, items=${body?.items?.length}, first.brand=${body?.items?.[0]?.brand}`,
  )
}

// ── 11. 404 routing check ──────────────────────────────────────────────
{
  const { status, body } = await call(consumables, {
    method: 'GET', url: '/api/consumables/abc',
  });
  ok('404 on invalid path',
    status === 400 || status === 404,
    `status=${status}, detail=${body?.detail}`,
  );
}

console.log('\n' + (process.exitCode ? '❌ SOME TESTS FAILED' : '🎉 ALL TESTS PASSED'));
