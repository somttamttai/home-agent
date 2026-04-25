import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { buildSearchQuery } from '../utils/brands.js'

const FILTER_PRESETS = {
  m: {
    type: 'ply',
    tabs: [
      { label: '전체',  value: '' },
      { label: '1겹',   value: '1' },
      { label: '2겹',   value: '2' },
      { label: '3겹',   value: '3' },
    ],
  },
  ml: {
    type: 'size',
    tabs: [
      { label: '전체',       value: '' },
      { label: '500ml↓',     value: '0-500' },
      { label: '500ml~1L',   value: '500-1000' },
      { label: '1L↑',        value: '1000-' },
    ],
  },
  g: {
    type: 'size',
    tabs: [
      { label: '전체',     value: '' },
      { label: '100g↓',    value: '0-100' },
      { label: '100~200g', value: '100-200' },
      { label: '200g↑',    value: '200-' },
    ],
  },
  '매': {
    type: 'size',
    tabs: [
      { label: '전체',      value: '' },
      { label: '50매↓',     value: '0-50' },
      { label: '50~100매',  value: '50-100' },
      { label: '100매↑',    value: '100-' },
    ],
  },
}

function detectUnitFromQuery(text) {
  if (!text) return null
  if (/화장지|키친타올|두루마리|롤휴지/.test(text)) return 'm'
  if (/샴푸|린스|바디워시|세제|섬유유연제|컨디셔너|핸드워시/.test(text)) return 'ml'
  if (/치약|세안제|폼클렌징/.test(text)) return 'g'
  if (/지퍼백|봉투|청소포|물티슈|드라이시트|마스크/.test(text)) return '매'
  if (/(\d)\s*겹|롤/.test(text)) return 'm'
  if (/\d+\s*(ml|mL|L)\b/i.test(text)) return 'ml'
  if (/\d+\s*(g|kg)\b/i.test(text)) return 'g'
  if (/\d+\s*매/.test(text)) return '매'
  return null
}

function specSummary(item) {
  if (!item) return ''
  const { specs, unit, total_size } = item
  if (unit === 'm' && specs?.rolls) {
    const parts = []
    if (specs.rolls)     parts.push(`${specs.rolls}롤`)
    if (specs.length_m)  parts.push(`${specs.length_m}m`)
    if (specs.ply)       parts.push(`${specs.ply}겹`)
    if (specs.packs > 1) parts.push(`${specs.packs}팩`)
    return parts.join(' × ')
  }
  if (total_size != null && unit) {
    return `총 ${total_size}${unit}`
  }
  return ''
}

function rankLabel(idx) {
  if (idx === 0) return '🥇 1위'
  if (idx === 1) return '🥈 2위'
  if (idx === 2) return '🥉 3위'
  return `${idx + 1}위`
}

function ShippingLabel({ shipping }) {
  if (shipping === 0) return <span className="shipping free">무료 🚚</span>
  if (shipping != null) return <span className="shipping">{shipping.toLocaleString()}원</span>
  return <span className="shipping unknown">별도 확인 필요</span>
}

export default function PriceCompare() {
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [brandsMap, setBrandsMap] = useState({})

  const [query, setQuery] = useState(sp.get('query') || '크리넥스 3겹 30m')
  const [filterValue, setFilterValue] = useState(sp.get('ply') || sp.get('size') || '')
  const [brand, setBrand] = useState(sp.get('brand') || '')
  const consumableId = sp.get('consumable_id')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runSearch = useCallback(async (q, fv, b) => {
    if (!q || q.trim().length < 2) {
      toast('검색어를 입력해주세요')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fullQuery = buildSearchQuery(q, b)
      const params = new URLSearchParams({ query: fullQuery })
      const unit = detectUnitFromQuery(q)
      const preset = unit ? FILTER_PRESETS[unit] : null
      if (preset && fv) params.set(preset.type, fv)
      if (consumableId) params.set('consumable_id', consumableId)
      const r = await fetch(`/api/prices/compare?${params}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [toast, consumableId])

  useEffect(() => {
    fetch('/api/brands', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setBrandsMap(data.brands || {}))
      .catch(() => toast('브랜드 정보 로드 실패'))
  }, [authHeaders])

  useEffect(() => {
    const urlQuery = sp.get('query')
    if (urlQuery) {
      const urlFilter = sp.get('ply') || sp.get('size') || ''
      const urlBrand = sp.get('brand') || ''
      setQuery(urlQuery)
      setFilterValue(urlFilter)
      setBrand(urlBrand)
      runSearch(urlQuery, urlFilter, urlBrand)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const detectedUnit = useMemo(
    () => detectUnitFromQuery(query) || data?.items?.[0]?.unit || null,
    [query, data]
  )
  const preset = detectedUnit ? FILTER_PRESETS[detectedUnit] : null
  const activeFilterLabel = useMemo(() => {
    if (!preset || !filterValue) return null
    return preset.tabs.find((t) => t.value === filterValue)?.label || null
  }, [preset, filterValue])

  const writeUrl = (q, fv, b) => {
    const next = new URLSearchParams()
    next.set('query', q)
    const unit = detectUnitFromQuery(q)
    const p = unit ? FILTER_PRESETS[unit] : null
    if (p && fv) next.set(p.type, fv)
    if (b) next.set('brand', b)
    setSp(next, { replace: true })
  }

  const onSearch = (e) => {
    e?.preventDefault()
    const newUnit = detectUnitFromQuery(query)
    const prevUnit = detectUnitFromQuery(sp.get('query') || '')
    const nextFilter = (newUnit !== prevUnit) ? '' : filterValue
    if (nextFilter !== filterValue) setFilterValue(nextFilter)
    setBrand('')
    writeUrl(query, nextFilter, '')
    runSearch(query, nextFilter, '')
  }

  const onFilterTab = (value) => {
    setFilterValue(value)
    writeUrl(query, value, brand)
    if (data) runSearch(query, value, brand)
  }

  const myBrand = useMemo(() => brandsMap[query?.trim()] || null, [query, brandsMap])

  const onShowAllBrands = () => {
    setBrand('')
    writeUrl(query, filterValue, '')
    runSearch(query, filterValue, '')
  }

  const onShowMyBrand = () => {
    if (!myBrand) {
      toast('이 상품에 등록된 선호 브랜드가 없어요')
      return
    }
    setBrand(myBrand)
    writeUrl(query, filterValue, myBrand)
    runSearch(query, filterValue, myBrand)
  }

  const onAddToStock = () => {
    const best = data?.cheapest
    const params = new URLSearchParams()
    params.set('name', query)
    if (best?.brand) params.set('brand', best.brand)
    const s = specSummary(best)
    if (s) params.set('spec', s)
    nav(`/add?${params}`)
  }

  return (
    <div className="page-enter">
      <PageHeader title="가격비교" />
      <div className="page">
        <form onSubmit={onSearch} className="search-wrap">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 크리넥스 3겹 30m"
          />
          {preset && (
            <div className="ply-tabs">
              {preset.tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`ply-tab ${filterValue === t.value ? 'active' : ''}`}
                  onClick={() => onFilterTab(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </form>

        {loading && (
          <div className="empty">
            <div className="spinner" />
            <div style={{ marginTop: 14 }}>네이버 쇼핑 검색중…</div>
          </div>
        )}

        {!loading && error && (
          <div className="empty">
            <div className="big-icon">⚠️</div>
            <div className="title">검색 실패</div>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="empty">
            <div className="big-icon">💰</div>
            <div className="title">최저가를 찾아드려요</div>
            <div>배송비 포함 총합으로 비교해요</div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="query-summary">
              <div className="label">검색어</div>
              <div className="q">{query}</div>
              <div className="stats">
                총 {data.total}건 · 배송비 포함 총합 순 ({data.valid}건)
                {activeFilterLabel && ` · ${activeFilterLabel} 필터`}
              </div>
              {data.avg_30d != null && data.cheapest && (() => {
                const now = data.cheapest.price
                const diffPct = Math.round(((data.avg_30d - now) / data.avg_30d) * 100)
                const cheaper = diffPct > 0
                return (
                  <div className="avg-price-row">
                    <div className="avg-label">
                      30일 평균 <strong>{data.avg_30d.toLocaleString()}원</strong>
                      {data.min_ever != null && (
                        <span className="avg-min"> · 역대 최저 {data.min_ever.toLocaleString()}원</span>
                      )}
                    </div>
                    <div className={`avg-diff ${cheaper ? 'cheaper' : 'pricier'}`}>
                      {cheaper ? `-${diffPct}% 저렴` : diffPct === 0 ? '평균과 동일' : `+${-diffPct}% 비쌈`}
                    </div>
                  </div>
                )
              })()}
            </div>

            {brand ? (
              <div className="brand-banner active">
                <span className="text">
                  🏷️ <strong>{brand}</strong> 브랜드 기준
                </span>
                <button type="button" className="link-btn" onClick={onShowAllBrands}>
                  전체 브랜드 보기
                </button>
              </div>
            ) : myBrand ? (
              <div className="brand-banner">
                <span className="text">전체 브랜드 비교 중</span>
                <button type="button" className="link-btn" onClick={onShowMyBrand}>
                  🏷️ {myBrand} 브랜드만 보기
                </button>
              </div>
            ) : null}

            {data.items && data.items.length > 0 ? (
              <>
                {data.items.map((it, idx) => {
                  const isTop = idx === 0
                  const spec = specSummary(it)
                  const displayTotal = it.price + (it.shipping ?? 0)
                  return (
                    <div
                      key={`${it.productId || idx}-${it.mall}`}
                      className={`rank-card ${isTop ? 'rank-gold' : ''}`}
                    >
                      <div className="rank-header">
                        <span className="rank-badge">{rankLabel(idx)}</span>
                        <span className="mall">{it.mall}</span>
                      </div>

                      <div className="rank-body">
                        <img src={it.image} alt="" loading="lazy" />
                        <div className="info">
                          <div className="title">{it.title}</div>
                          {spec && <div className="spec-chip">{spec}</div>}
                        </div>
                      </div>

                      <div className="rank-breakdown">
                        <div className="row">
                          <span className="label">상품가</span>
                          <span className="val">{it.price.toLocaleString()}원</span>
                        </div>
                        <div className="row">
                          <span className="label">배송비</span>
                          <ShippingLabel shipping={it.shipping} />
                        </div>
                        <div className="row total">
                          <span className="label">총합</span>
                          <span className="val">{displayTotal.toLocaleString()}원</span>
                        </div>
                        {it.unit_price != null && it.unit_price > 0 && (
                          <div className="row unit">
                            <span className="label">단위가격</span>
                            <span className="val">{it.unit_price}원/{it.unit}</span>
                          </div>
                        )}
                      </div>

                      <div className="rank-action">
                        <a
                          className={`btn small ${isTop ? '' : 'tonal'}`}
                          href={it.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => sessionStorage.setItem('fromCompare', '1')}
                        >
                          🛒 구매하기
                        </a>
                      </div>
                    </div>
                  )
                })}

                <button
                  type="button"
                  className="btn tonal block"
                  style={{ marginTop: 8 }}
                  onClick={onAddToStock}
                >
                  ＋ 이 상품 재고에 추가하기
                </button>
              </>
            ) : (
              <div className="empty">
                <div className="big-icon">🔍</div>
                <div className="title">검색 결과가 없어요</div>
                {filterValue && <div>다른 옵션으로 검색해보세요</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
