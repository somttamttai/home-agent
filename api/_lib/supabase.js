// Supabase REST API wrapper
// service_role 키가 있으면 RLS 우회, 없으면 전달된 토큰 사용

function base() {
  return `${process.env.SUPABASE_URL}/rest/v1`;
}

function getKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
}

function headers(extra = {}) {
  const key = getKey();
  return {
    apikey: process.env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function qs(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    sp.set(k, String(v));
  }
  return sp.toString();
}

async function ensureOk(r, label) {
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`supabase ${label} ${r.status}: ${text.slice(0, 200)}`);
  }
}

export async function select(table, params = {}) {
  const q = qs(params);
  const url = q ? `${base()}/${table}?${q}` : `${base()}/${table}`;
  const r = await fetch(url, { headers: headers() });
  await ensureOk(r, `select ${table}`);
  return r.json();
}

export async function insert(table, row) {
  const r = await fetch(`${base()}/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  await ensureOk(r, `insert ${table}`);
  const arr = await r.json();
  return arr[0];
}

export async function update(table, match, patch) {
  const matchParams = Object.fromEntries(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`])
  );
  const url = `${base()}/${table}?${qs(matchParams)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  await ensureOk(r, `update ${table}`);
  return r.json();
}

export async function del(table, match) {
  const matchParams = Object.fromEntries(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`])
  );
  const url = `${base()}/${table}?${qs(matchParams)}`;
  const r = await fetch(url, { method: 'DELETE', headers: headers() });
  await ensureOk(r, `delete ${table}`);
}

export async function getById(table, id) {
  const rows = await select(table, { id: `eq.${id}`, limit: 1 });
  return rows[0] || null;
}
