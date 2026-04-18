// 상품명 키워드 → 추천 브랜드 (최대 3개)
const KEYWORD_BRANDS = [
  { keys: ['화장지', '휴지', '두루마리', '롤티슈'], brands: ['유한킴벌리', '깨끗한나라', '모나리자'] },
  { keys: ['각티슈', '미용티슈', '티슈'], brands: ['크리넥스', '유한킴벌리', '깨끗한나라'] },
  { keys: ['물티슈'], brands: ['몽드드', '해피팩토리', '쁘띠엘린'] },
  { keys: ['세탁세제', '세제'], brands: ['테크', '퍼실', '피죤'] },
  { keys: ['섬유유연제', '유연제'], brands: ['다우니', '피죤', '샤프란'] },
  { keys: ['주방세제', '퐁퐁', '주방용'], brands: ['트리오', '자연퐁', '애경'] },
  { keys: ['샴푸', '린스', '컨디셔너'], brands: ['엘라스틴', '려', '미쟝센'] },
  { keys: ['바디워시', '바디클렌저', '샤워젤'], brands: ['도브', '해피바스', '로제트'] },
  { keys: ['비누'], brands: ['도브', '애경', '아이소이'] },
  { keys: ['치약'], brands: ['메디안', '2080', '페리오'] },
  { keys: ['칫솔'], brands: ['오랄비', '메디안', '페리오'] },
  { keys: ['구강청결제', '가글'], brands: ['리스테린', '가그린', '페리오'] },
  { keys: ['기저귀'], brands: ['하기스', '팸퍼스', '마미포코'] },
  { keys: ['생리대'], brands: ['위스퍼', '좋은느낌', '유한킴벌리'] },
  { keys: ['쓰레기봉투', '종량제'], brands: ['크린랩', '코멕스', '락앤락'] },
  { keys: ['지퍼백', '위생백'], brands: ['크린랩', '지퍼락', '락앤락'] },
  { keys: ['랩'], brands: ['크린랩', '헨켈', '쿠킹랩'] },
  { keys: ['즉석밥', '햇반'], brands: ['햇반', '오뚜기', '동원'] },
  { keys: ['라면'], brands: ['농심', '오뚜기', '삼양'] },
  { keys: ['분유'], brands: ['남양', '매일', '일동후디스'] },
  { keys: ['커피', '원두'], brands: ['맥심', '카누', '동서'] },
  { keys: ['우유'], brands: ['서울우유', '매일', '남양'] },
  { keys: ['생수', '물'], brands: ['삼다수', '아이시스', '백산수'] },
  { keys: ['건전지', '배터리'], brands: ['듀라셀', '에너자이저', '로케트'] },
  { keys: ['청소', '물걸레', '먼지', '클리너'], brands: ['크린랩', '매직블럭', '참그린'] },
]

// 카테고리 fallback
const CATEGORY_BRANDS = {
  '욕실': ['유한킴벌리', '메디안', '도브'],
  '주방': ['크린랩', '트리오', '애경'],
  '거실': ['유한킴벌리', '모나리자', '크리넥스'],
}

export function recommendBrands(name, category) {
  const n = (name || '').toLowerCase().replace(/\s/g, '')
  for (const { keys, brands } of KEYWORD_BRANDS) {
    if (keys.some((k) => n.includes(k.toLowerCase()))) return brands
  }
  if (category && CATEGORY_BRANDS[category]) return CATEGORY_BRANDS[category]
  return []
}

// 상품명 키워드 → 추천 규격 (최대 3개, 한국 시장 대표 패키지)
const KEYWORD_SPECS = [
  { keys: ['화장지', '휴지', '두루마리', '롤티슈'], specs: ['2겹 30롤', '3겹 30롤', '2겹 50롤'] },
  { keys: ['각티슈', '미용티슈'], specs: ['200매 3입', '210매 5입', '150매 6입'] },
  { keys: ['물티슈'], specs: ['80매 10팩', '100매 10팩', '엠보싱 80매'] },
  { keys: ['키친타올', '키친타월'], specs: ['150매 6롤', '2겹 100매', '150매 3롤'] },
  { keys: ['세탁세제'], specs: ['3kg', '5L', '4L 리필'] },
  { keys: ['섬유유연제', '유연제'], specs: ['2L', '3L', '1.5L 리필'] },
  { keys: ['주방세제', '퐁퐁'], specs: ['1.2L', '750ml', '500ml 리필'] },
  { keys: ['표백제'], specs: ['1kg', '2L', '5kg'] },
  { keys: ['섬유탈취제', '의류탈취제'], specs: ['370ml', '600ml', '1L 리필'] },
  { keys: ['드라이시트'], specs: ['80매', '160매', '40매'] },
  { keys: ['샴푸'], specs: ['500ml', '750ml', '1L'] },
  { keys: ['린스', '컨디셔너'], specs: ['500ml', '750ml', '1L'] },
  { keys: ['바디워시', '바디클렌저', '샤워젤'], specs: ['500ml', '750ml', '1L'] },
  { keys: ['바디로션'], specs: ['400ml', '500ml', '300ml'] },
  { keys: ['폼클렌징'], specs: ['150ml', '200ml', '100ml'] },
  { keys: ['비누'], specs: ['90g 3개입', '100g 4개입', '100g'] },
  { keys: ['치약'], specs: ['120g 4개입', '150g', '100g 3개입'] },
  { keys: ['칫솔'], specs: ['4개입', '8개입', '12개입'] },
  { keys: ['구강청결제', '가글'], specs: ['500ml', '1L', '250ml'] },
  { keys: ['면도기'], specs: ['리필 4개입', '리필 8개입', '본체+리필 2개'] },
  { keys: ['면도크림'], specs: ['200ml', '150ml', '300ml'] },
  { keys: ['면봉'], specs: ['200개입', '300개입', '500개입'] },
  { keys: ['화장솜'], specs: ['80매', '200매', '500매'] },
  { keys: ['기저귀'], specs: ['대형 72매', '중형 80매', '특대형 60매'] },
  { keys: ['생리대'], specs: ['중형 18매', '대형 16매', '라이너 40매'] },
  { keys: ['기저귀봉투'], specs: ['200매', '100매', '300매'] },
  { keys: ['분유'], specs: ['800g', '750g', '400g'] },
  { keys: ['욕실세제', '변기세정제'], specs: ['500ml', '750ml', '3개입'] },
  { keys: ['방향제'], specs: ['리필 2개입', '300ml', '스프레이 370ml'] },
  { keys: ['모기향'], specs: ['30개입', '10개입', '50개입'] },
  { keys: ['모기패치'], specs: ['24매', '60매', '48매'] },
  { keys: ['방습제'], specs: ['3개입', '6개입', '12개입'] },
  { keys: ['방충제'], specs: ['4개입', '3개입', '6개입'] },
  { keys: ['전구'], specs: ['LED 3개입', 'LED 1개', 'LED 5개입'] },
  { keys: ['건전지', '배터리'], specs: ['AA 8개입', 'AAA 8개입', 'AA 4개입'] },
  { keys: ['공기청정기 필터', '에어컨 필터'], specs: ['교체용 1개', '2개 세트', '호환 필터'] },
  { keys: ['쓰레기봉투', '종량제'], specs: ['20L 50매', '50L 20매', '10L 50매'] },
  { keys: ['재활용봉투'], specs: ['50매', '100매', '30매'] },
  { keys: ['청소포', '바닥청소포'], specs: ['30매', '60매', '20매'] },
  { keys: ['락스'], specs: ['1L', '2L', '500ml'] },
  { keys: ['유리세정제'], specs: ['500ml', '1L', '300ml'] },
  { keys: ['지퍼백', '위생백'], specs: ['중형 50매', '대형 30매', '소형 100매'] },
  { keys: ['랩'], specs: ['22cm x 50m', '30cm x 100m', '22cm x 25m'] },
  { keys: ['알루미늄호일', '호일'], specs: ['25cm x 30m', '30cm x 50m', '22cm x 10m'] },
  { keys: ['위생장갑'], specs: ['100매', '200매', '50매'] },
  { keys: ['종이컵'], specs: ['50개입', '100개입', '30개입'] },
  { keys: ['수세미'], specs: ['5개입', '3개입', '10개입'] },
  { keys: ['이쑤시개'], specs: ['500개입', '1000개입', '200개입'] },
  { keys: ['행주'], specs: ['10매', '5매', '20매'] },
  { keys: ['스펀지'], specs: ['5개입', '3개입', '10개입'] },
  { keys: ['고무장갑'], specs: ['1켤레', '3켤레', '중형 1켤레'] },
  { keys: ['식기세척기세제'], specs: ['60정', '100정', '1kg'] },
  { keys: ['세탁망'], specs: ['3개입', '5개입', '중형 1개'] },
  { keys: ['옷걸이'], specs: ['10개입', '20개입', '50개입'] },
  { keys: ['구두약'], specs: ['40g', '50ml', '75ml'] },
  { keys: ['실리카겔', '제습제'], specs: ['10개입', '3개입', '6개입'] },
  { keys: ['아기물티슈'], specs: ['80매 10팩', '100매 10팩', '70매 10팩'] },
  { keys: ['아기샴푸', '아기로션', '아기바디워시'], specs: ['350ml', '500ml', '300ml'] },
  { keys: ['젖병세정제'], specs: ['500ml', '700ml', '1L 리필'] },
  { keys: ['거즈손수건'], specs: ['10매', '20매', '30매'] },
  { keys: ['체온계배터리'], specs: ['CR2032 1개', 'LR44 4개', 'AAA 2개'] },
  { keys: ['밴드'], specs: ['20매', '100매', '50매'] },
  { keys: ['마스크'], specs: ['50매', '30매', '100매'] },
  { keys: ['손소독제'], specs: ['500ml', '1L', '50ml'] },
  { keys: ['소독솜'], specs: ['100매', '50매', '200매'] },
  { keys: ['사료'], specs: ['2kg', '5kg', '1kg'] },
  { keys: ['간식'], specs: ['100g', '200g', '300g'] },
  { keys: ['배변봉투'], specs: ['100매', '200매', '50매'] },
  { keys: ['펫패드'], specs: ['50매', '100매', '30매'] },
  { keys: ['모래', '펫시트'], specs: ['7L', '10L', '5L'] },
  { keys: ['구충제'], specs: ['3개월분', '6개월분', '1개월분'] },
]

export function recommendSpecs(name) {
  const n = (name || '').toLowerCase().replace(/\s/g, '')
  if (!n) return []
  for (const { keys, specs } of KEYWORD_SPECS) {
    if (keys.some((k) => n.includes(k.toLowerCase()))) return specs
  }
  return []
}

// 사용자 이력 기반: 빈도 높은 순으로 최대 3개
function historyByField(items, field, { excludeName } = {}) {
  const count = new Map()
  for (const it of items || []) {
    const v = (it[field] || '').trim()
    if (!v) continue
    if (excludeName && it.name === excludeName) continue
    count.set(v, (count.get(v) || 0) + 1)
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([v]) => v)
}

export function historyBrands(items, opts) {
  return historyByField(items, 'brand', opts)
}

export function historySpecs(items, opts) {
  return historyByField(items, 'spec', opts)
}
