import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'

const PLY_TABS = [
  { label: '전체', value: '' },
  { label: '1겹',  value: '1' },
  { label: '2겹',  value: '2' },
  { label: '3겹',  value: '3' },
]

// 화장지/키친타올 (m 단위) → rolls × length × ply × packs
// 그 외 (ml/g/매/개) → "총 N{unit}"
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

export default function PriceCompare() {
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const toast = useToast()

  const [query, setQuery] = useState(sp.get('query') || '크리넥스 3겹 30m')
  const [ply, setPly] = useState(sp.get('ply') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runSearch = useCallback(async (q, p) => {
    if (!q || q.trim().length < 2) {
      toast('검색어를 입력해주세요')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ query: q })
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
    const urlQuery = sp.get('query')
    if (urlQuery) {
      setQuery(urlQuery)
      const urlPly = sp.get('ply') || ''
      setPly(urlPly)
      runSearch(urlQuery, urlPly)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearch = (e) => {
    e?.preventDefault()
    const next = new URLSearchParams()
    next.set('query', query)
    if (ply) next.set('ply', ply)
    setSp(next, { replace: true })
    runSearch(query, ply)
  }

  const onPlyTab = (value) => {
    setPly(value)
    const next = new URLSearchParams()
    next.set('query', query)
    if (value) next.set('ply', value)
    setSp(next, { replace: true })
    if (data) runSearch(query, value)
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
            <div>단위당 가격으로 비교해요 (원/ml, 원/g 등)</div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="query-summary">
              <div className="label">검색어</div>
              <div className="q">{query}</div>
              <div className="stats">
                총 {data.total}건 ·{' '}
                {data.sorted_by === 'unit_price'
                  ? `단위가격 순 정렬 (${data.valid}건)`
                  : '가격 기준 정렬'}
                {ply && ` · ${ply}겹 필터`}
              </div>
            </div>

            {data.items && data.items.length > 0 ? (
              <>
                {data.items.map((it, idx) => {
                  const isTop = idx === 0
                  const spec = specSummary(it)
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

                      <div className="rank-price">
                        <div>
                          <div className="price-big">
                            {it.price.toLocaleString()}<span className="won">원</span>
                          </div>
                          {it.unit_price != null && it.unit_price > 0 && (
                            <div className="unit-big">
                              {it.unit_price}원/{it.unit}
                            </div>
                          )}
                        </div>
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
