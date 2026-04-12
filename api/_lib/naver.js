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

// ── 단위 자동 감지 ─────────────────────────────────────────────────────
// 상품명 키워드로 어떤 단위로 비교하면 좋을지 판단.
export function detectUnit(title) {
  if (/화장지|키친타올|두루마리|롤휴지/.test(title)) return 'm';
  if (/샴푸|린스|바디워시|세제|섬유유연제|컨디셔너|핸드워시/.test(title)) return 'ml';
  if (/치약|세안제|폼클렌징/.test(title)) return 'g';
  if (/지퍼백|봉투|청소포|물티슈|드라이시트|마스크/.test(title)) return '매';
  return '개';
}

// ── 기존 spec 파서 (UI spec chip 표시용으로 유지) ──────────────────────
export function parseSpecs(title) {
  const t = title.replace(/,/g, '');
  const out = { rolls: null, length_m: null, ply: null, packs: 1 };
  let m;

  m = t.match(/(\d+)\s*롤/);
  if (m) out.rolls = parseInt(m[1], 10);

  m = t.match(/(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])/);
  if (m) out.length_m = parseFloat(m[1]);

  m = t.match(/(\d+)\s*겹/);
  if (m) out.ply = parseInt(m[1], 10);

  m = t.match(/(\d+)\s*팩/);
  if (m) out.packs = parseInt(m[1], 10);
  else if (/1\s*\+\s*1/.test(t)) out.packs = 2;

  return out;
}

// ── 단위별 총량 파싱 ───────────────────────────────────────────────────
// 반환: 해당 단위의 총량 (예: 800 ml, 360 g, 150 매)
//   - 팩수 (N팩 / 1+1) 곱셈 적용
//   - 단위 변환: L→ml(×1000), kg→g(×1000)
export function parseTotalSize(title, unit) {
  const t = title.replace(/,/g, '');

  let packs = 1;
  const packMatch = t.match(/(\d+)\s*팩/);
  if (packMatch) packs = parseInt(packMatch[1], 10);
  else if (/1\s*\+\s*1/.test(t)) packs = 2;

  let m;
  switch (unit) {
    case 'm': {
      const r = t.match(/(\d+)\s*롤/);
      const l = t.match(/(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])/);
      if (r && l) {
        return parseInt(r[1], 10) * parseFloat(l[1]) * packs;
      }
      return null;
    }
    case 'ml': {
      m = t.match(/(\d+(?:\.\d+)?)\s*(ml|mL|L|l)(?![a-zA-Z])/);
      if (m) {
        const v = parseFloat(m[1]);
        const u = m[2].toLowerCase();
        return (u === 'l' ? v * 1000 : v) * packs;
      }
      return null;
    }
    case 'g': {
      m = t.match(/(\d+(?:\.\d+)?)\s*(kg|g)(?![a-zA-Z])/);
      if (m) {
        const v = parseFloat(m[1]);
        const u = m[2].toLowerCase();
        return (u === 'kg' ? v * 1000 : v) * packs;
      }
      return null;
    }
    case '매': {
      m = t.match(/(\d+)\s*매/);
      if (m) return parseInt(m[1], 10) * packs;
      return null;
    }
    case '개': {
      // "5개입" 우선, "10개" 다음, 둘 다 없으면 packs (또는 1)
      m = t.match(/(\d+)\s*개입/);
      if (m) return parseInt(m[1], 10) * packs;
      m = t.match(/(\d+)\s*개(?!입)/);
      if (m) return parseInt(m[1], 10);
      return packs;
    }
    default:
      return null;
  }
}

// 단위가격 = 가격 / 총량 (소수점 둘째자리 반올림)
export function calcUnitPrice(price, totalSize) {
  if (!totalSize || totalSize <= 0) return null;
  return Math.round((price / totalSize) * 100) / 100;
}

// ── 검색 ───────────────────────────────────────────────────────────────
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
    const unit = detectUnit(title);
    const totalSize = parseTotalSize(title, unit);
    const unitPrice = calcUnitPrice(price, totalSize);

    // 배송비 추출
    let shipping = null;
    if (it.delivery != null && it.delivery !== '') {
      const deliveryVal = parseInt(it.delivery, 10);
      if (!Number.isNaN(deliveryVal)) shipping = deliveryVal;
    }

    const total = price + (shipping ?? 0);

    return {
      title,
      price,
      shipping,
      total,
      mall: it.mallName,
      link: it.link,
      image: it.image,
      productId: it.productId,
      brand: it.brand || '',
      category: it.category3 || '',
      specs,
      unit,
      total_size: totalSize,
      unit_price: unitPrice,
    };
  });
}

export async function findCheapest(query, ply = null) {
  const items = await search(query, { display: 100, sort: 'sim' });
  const valid = items.filter(
    (i) =>
      i.unit_price != null &&
      i.unit_price > 0 &&
      (ply == null || i.specs.ply === ply)
  );
  if (valid.length === 0) return null;
  return valid.reduce((min, cur) =>
    cur.unit_price < min.unit_price ? cur : min
  );
}
