import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { buildSearchQuery } from '../utils/brands.js'

const PLY_TABS = [
  { label: '전체', value: '' },
  { label: '1겹',  value: '1' },
  { label: '2겹',  value: '2' },
  { label: '3겹',  value: '3' },
]

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
  const [ply, setPly] = useState(sp.get('ply') || '')
  const [brand, setBrand] = useState(sp.get('brand') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runSearch = useCallback(async (q, p, b) => {
    if (!q || q.trim().length < 2) {
      toast('검색어를 입력해주세요')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fullQuery = buildSearchQuery(q, b)
      const params = new URLSearchParams({ query: fullQuery })
      if (p) params.set('ply', p)
      const r = await fetch(`/api/prices/compare?${params}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetch('/api/brands', { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setBrandsMap(data.brands || {}))
      .catch(() => toast('브랜드 정보 로드 실패'))
  }, [authHeaders])

  useEffect(() => {
    const urlQuery = sp.get('query')
    if (urlQuery) {
      const urlPly = sp.get('ply') || ''
      const urlBrand = sp.get('brand') || ''
      setQuery(urlQuery)
      setPly(urlPly)
      setBrand(urlBrand)
      runSearch(urlQuery, urlPly, urlBrand)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const writeUrl = (q, p, b) => {
    const next = new URLSearchParams()
    next.set('query', q)
    if (p) next.set('ply', p)
    if (b) next.set('brand', b)
    setSp(next, { replace: true })
  }

  const onSearch = (e) => {
    e?.preventDefault()
    setBrand('')
    writeUrl(query, ply, '')
    runSearch(query, ply, '')
  }

  const onPlyTab = (value) => {
    setPly(value)
    writeUrl(query, value, brand)
    if (data) runSearch(query, value, brand)
  }

  const myBrand = useMemo(() => brandsMap[query?.trim()] || null, [query, brandsMap])

  const onShowAllBrands = () => {
    setBrand('')
    writeUrl(query, ply, '')
    runSearch(query, ply, '')
  }

  const onShowMyBrand = () => {
    if (!myBrand) {
      toast('이 상품에 등록된 선호 브랜드가 없어요')
      return
    }
    setBrand(myBrand)
    writeUrl(query, ply, myBrand)
    runSearch(query, ply, myBrand)
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
    <div>
      <PageHeader title="가격비교" />
      <div className="page">
        <form onSubmit={onSearch} className="search-wrap">
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 크리넥스 3겹 30m"
          />
          <div className="ply-tabs">
            {PLY_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`ply-tab ${ply === t.value ? 'active' : ''}`}
                onClick={() => onPlyTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
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
                {ply && ` · ${ply}겹 필터`}
              </div>
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
                {ply && <div>다른 겹수로 검색해보세요</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
