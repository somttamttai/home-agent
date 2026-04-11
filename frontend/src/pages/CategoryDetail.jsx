import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import StockCard from '../components/StockCard.jsx'
import { useConsumables } from '../hooks/useConsumables.js'

const CAT_ICON = {
  욕실: '🛁',
  주방: '🍳',
  세탁실: '🧺',
  청소: '🧹',
  침실: '🛏',
  드레스룸: '👔',
  기타: '📦',
}

export default function CategoryDetail() {
  const { name } = useParams()
  const decoded = decodeURIComponent(name || '')
  const icon = CAT_ICON[decoded] || '📦'

  const {
    items, loading, error, reload,
    onStockChange, onUpdate, onDelete, onRefresh,
  } = useConsumables()

  const filtered = useMemo(
    () => items.filter((i) => (i.category || '기타') === decoded),
    [items, decoded],
  )

  const low = filtered.filter((i) => i.need_reorder)

  return (
    <div>
      <PageHeader title={`${icon} ${decoded}`} />
      <div className="page">
        {loading && <div className="empty">불러오는 중…</div>}

        {!loading && error && (
          <div className="empty">
            <div className="big-icon">⚠️</div>
            <div className="title">서버 연결 실패</div>
            <div style={{ marginBottom: 16 }}>{error}</div>
            <button className="btn tonal" onClick={reload}>다시 시도</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty">
            <div className="big-icon">{icon}</div>
            <div className="title">이 카테고리에 등록된 소모품이 없어요</div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="section-title" style={{ paddingTop: 0 }}>
              {filtered.length}개
              {low.length > 0 && (
                <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                  · ⚠️ 부족 {low.length}개
                </span>
              )}
            </div>
            {filtered.map((it) => (
              <StockCard
                key={it.id}
                item={it}
                onRefresh={onRefresh}
                onStockChange={onStockChange}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
