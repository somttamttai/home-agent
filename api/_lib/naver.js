// 네이버 쇼핑 API + 상품명 파서.
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

const SHOP_URL = 'https://openapi.naver.com/v1/search/shop.json';

function headers() {
  return {
    'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
    'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
  };
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

// Python 의 html.unescape + re.sub('<[^>]+>','') 동등
export function cleanTitle(title) {
  return title
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

export function parseSpecs(title) {
  const t = title.replace(/,/g, '');
  const out = { rolls: null, length_m: null, ply: null, packs: 1 };

  let m = t.match(/(\d+)\s*롤/);
  if (m) out.rolls = parseInt(m[1], 10);

  m = t.match(/(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])/);
  if (m) out.length_m = parseFloat(m[1]);

  m = t.match(/(\d+)\s*겹/);
  if (m) out.ply = parseInt(m[1], 10);

  m = t.match(/(\d+)\s*팩/);
  if (m) {
    out.packs = parseInt(m[1], 10);
  } else if (/1\s*\+\s*1/.test(t)) {
    out.packs = 2;
  }

  return out;
}

export function unitPricePerMeter(price, specs) {
  const { rolls, length_m, packs = 1 } = specs;
  if (!rolls || !length_m) return null;
  const totalM = rolls * length_m * packs;
  if (!totalM) return null;
  // Python round(x, 2) 에 해당
  return Math.round((price / totalM) * 100) / 100;
}

export async function search(query, { display = 20, sort = 'sim' } = {}) {
  const params = new URLSearchParams({
    query,
    display: String(display),
    sort,
  });
  const r = await fetch(`${SHOP_URL}?${params}`, { headers: headers() });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`naver search ${r.status}: ${text.slice(0, 200)}`);
  }
  const data = await r.json();
  const items = data.items || [];
  return items.map((it) => {
    const title = cleanTitle(it.title);
    const price = parseInt(it.lprice, 10);
    const specs = parseSpecs(title);
    return {
      title,
      price,
      mall: it.mallName,
      link: it.link,
      image: it.image,
      productId: it.productId,
      brand: it.brand || '',
      category: it.category3 || '',
      specs,
      unit_per_m: unitPricePerMeter(price, specs),
    };
  });
}

export async function findCheapest(query, ply = null) {
  const items = await search(query, { display: 100, sort: 'sim' });
  const valid = items.filter(
    (i) =>
      i.unit_per_m != null &&
      i.unit_per_m >= 1 &&
      i.unit_per_m <= 1000 &&
      (ply == null || i.specs.ply === ply)
  );
  if (valid.length === 0) return null;
  return valid.reduce((min, cur) =>
    cur.unit_per_m < min.unit_per_m ? cur : min
  );
}
