// Supabase REST API wrapper (anon key).
// 환경변수: SUPABASE_URL, SUPABASE_ANON_KEY
// token 파라미터가 있으면 사용자 JWT로 호출 (RLS에서 auth.uid() 인식)

function base() {
  return `${process.env.SUPABASE_URL}/rest/v1`;
}

function headers(token, extra = {}) {
  const key = process.env.SUPABASE_ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
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

export async function select(table, params = {}, token = null) {
  const q = qs(params);
  const url = q ? `${base()}/${table}?${q}` : `${base()}/${table}`;
  const r = await fetch(url, { headers: headers(token) });
  await ensureOk(r, `select ${table}`);
  return r.json();
}

export async function insert(table, row, token = null) {
  const r = await fetch(`${base()}/${table}`, {
    method: 'POST',
    headers: headers(token, { Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  await ensureOk(r, `insert ${table}`);
  const arr = await r.json();
  return arr[0];
}

export async function update(table, match, patch, token = null) {
  const matchParams = Object.fromEntries(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`])
  );
  const url = `${base()}/${table}?${qs(matchParams)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: headers(token, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  await ensureOk(r, `update ${table}`);
  return r.json();
}

export async function del(table, match, token = null) {
  const matchParams = Object.fromEntries(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`])
  );
  const url = `${base()}/${table}?${qs(matchParams)}`;
  const r = await fetch(url, { method: 'DELETE', headers: headers(token) });
  await ensureOk(r, `delete ${table}`);
}

export async function getById(table, id, token = null) {
  const rows = await select(table, { id: `eq.${id}`, limit: 1 }, token);
  return rows[0] || null;
}
