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

function specSummary(specs) {
  if (!specs) return ''
  const parts = []
  if (specs.rolls)     parts.push(`${specs.rolls}롤`)
  if (specs.length_m)  parts.push(`${specs.length_m}m`)
  if (specs.ply)       parts.push(`${specs.ply}겹`)
  if (specs.packs > 1) parts.push(`${specs.packs}팩`)
  return parts.join(' × ')
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
    if (best?.specs) {
      const s = specSummary(best.specs)
      if (s) params.set('spec', s)
    }
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
            <div>단위당(m당) 가격으로 비교해요</div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="query-summary">
              <div className="label">검색어</div>
              <div className="q">{query}</div>
              <div className="stats">
                총 {data.total}건 · 단위가격 계산 {data.valid}건
                {ply && ` · ${ply}겹 필터`}
              </div>
            </div>

            {data.items && data.items.length > 0 ? (
              <>
                {data.items.map((it, idx) => {
                  const isTop = idx === 0
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
                          {it.specs && specSummary(it.specs) && (
                            <div className="spec-chip">{specSummary(it.specs)}</div>
                          )}
                        </div>
                      </div>

                      <div className="rank-price">
                        <div>
                          <div className="price-big">
                            {it.price.toLocaleString()}<span className="won">원</span>
                          </div>
                          <div className="unit-big">m당 {it.unit_per_m}원</div>
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
                <div className="title">단위가격을 계산할 수 있는 상품이 없어요</div>
                {ply && <div>다른 겹수로 검색해보세요</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
