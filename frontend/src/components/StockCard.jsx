import AlertBadge from './AlertBadge.jsx'

export default function StockCard({ item, onRefresh, onStockChange, onDelete }) {
  const {
    name, brand, spec, current_stock, max_stock,
    daily_usage, days_left, deplete_at, reorder_point, need_reorder,
  } = item

  const pct = max_stock && max_stock > 0
    ? Math.max(0, Math.min(100, (current_stock / max_stock) * 100))
    : 0

  const depleteText = deplete_at
    ? new Date(deplete_at).toLocaleDateString('ko-KR', {
        month: 'short', day: 'numeric',
      })
    : '—'

  const step = daily_usage && daily_usage < 1 ? 0.5 : 1

  const onMinus = () => {
    const next = Math.max(0, Number(current_stock) - step)
    onStockChange?.(item, next)
  }
  const onPlus = () => {
    const next = Number(current_stock) + step
    onStockChange?.(item, next)
  }
  const onDeleteClick = () => {
    if (confirm(`"${name}" 삭제할까요?`)) onDelete?.(item)
  }

  return (
    <div className={`card stock-card ${need_reorder ? 'warning' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3>{name}</h3>
          <div className="meta">
            {brand ? `${brand} · ` : ''}{spec || ''}
          </div>
        </div>
        <AlertBadge daysLeft={days_left} reorderPoint={reorder_point ?? 0} />
      </div>

      <div className="bar">
        <div style={{ width: `${pct}%` }} />
      </div>

      <div className="days">
        <span>재고 {current_stock}{max_stock ? ` / ${max_stock}` : ''}</span>
        <span>{days_left != null ? `${days_left}일 남음` : '사용량 미입력'}</span>
      </div>
      <div className="days" style={{ marginTop: 4, color: '#6b7280' }}>
        <span>소진 예상 {depleteText}</span>
        <span>{daily_usage ? `일 ${daily_usage} 사용` : ''}</span>
      </div>

      {onStockChange && (
        <div className="stock-controls">
          <button type="button" onClick={onMinus} aria-label="재고 감소">−</button>
          <span className="value">{current_stock}</span>
          <button type="button" onClick={onPlus} aria-label="재고 증가">＋</button>
          {onDelete && (
            <button type="button" className="delete-btn" onClick={onDeleteClick} aria-label="삭제">
              🗑
            </button>
          )}
        </div>
      )}

      {onRefresh && (
        <button
          className="btn secondary block"
          style={{ marginTop: 8 }}
          onClick={() => onRefresh(item)}
        >
          💰 최저가 새로고침
        </button>
      )}
    </div>
  )
}
