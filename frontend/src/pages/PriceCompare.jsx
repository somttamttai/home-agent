import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  if (specs.rolls)      parts.push(`${specs.rolls}롤`)
  if (specs.length_m)   parts.push(`${specs.length_m}m`)
  if (specs.ply)        parts.push(`${specs.ply}겹`)
  if (specs.packs > 1)  parts.push(`${specs.packs}팩`)
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

  // URL에 query 가 들어오면 자동 검색 (예: 홈에서 "최저가 새로고침" 클릭)
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
    if (best?.brand)            params.set('brand', best.brand)
    if (best?.specs) {
      const s = specSummary(best.specs)
      if (s) params.set('spec', s)
    }
    nav(`/add?${params}`)
  }

  return (
    <div>
      <form onSubmit={onSearch} className="card">
        <b>💰 네이버 최저가 비교</b>
        <div style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>
          단위당(m당) 가격 기준으로 정렬
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 크리넥스 3겹 30m"
          style={{
            width: '100%', padding: 10, borderRadius: 8,
            border: '1px solid #d1d5db', marginBottom: 10,
            fontSize: 15,
          }}
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

        <button className="btn block" disabled={loading}>
          {loading ? '검색중…' : '🔍 최저가 찾기'}
        </button>
        {error && (
          <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
      </form>

      {loading && (
        <div className="card empty">
          <div className="spinner" />
          <div style={{ marginTop: 12 }}>네이버 쇼핑 검색중…</div>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="card">
            <div style={{ fontSize: 13, color: '#6b7280' }}>검색어</div>
            <b style={{ fontSize: 17 }}>{query}</b>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              총 {data.total}건 중 {data.valid}건 단위가격 계산 가능
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
                    className={`card rank-card ${isTop ? 'rank-gold' : ''}`}
                  >
                    <div className="rank-header">
                      <span className="rank-badge">{rankLabel(idx)}</span>
                      <span className="mall">{it.mall}</span>
                    </div>

                    <div className="rank-body">
                      <img src={it.image} alt="" />
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
                          {it.price.toLocaleString()}<span>원</span>
                        </div>
                        <div className="unit-big">m당 {it.unit_per_m}원</div>
                      </div>
                      <a
                        className={`btn ${isTop ? '' : 'secondary'}`}
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

              <button className="btn secondary block" onClick={onAddToStock}>
                ➕ 이 상품 재고에 추가하기
              </button>
            </>
          ) : (
            <div className="card empty">
              단위가격을 계산할 수 있는 상품이 없어요.
              {ply && <><br />다른 겹수로 검색해보세요.</>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
