export default function StockCard({ item, onRefresh, onStockChange, onDelete }) {
  const {
    name, brand, spec, current_stock, max_stock,
    daily_usage, days_left, reorder_point, need_reorder,
  } = item

  const pct = max_stock && max_stock > 0
    ? Math.max(0, Math.min(100, (current_stock / max_stock) * 100))
    : days_left != null && reorder_point
      ? Math.max(5, Math.min(100, (days_left / (reorder_point * 3)) * 100))
      : 50

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
    <div className={`stock-card ${need_reorder ? 'warning' : ''}`}>
      <div className="top">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name">{name}</div>
          <div className="meta">
            {[brand, spec].filter(Boolean).join(' · ') || '\u00A0'}
          </div>
        </div>
        <div className="days">
          {days_left != null ? (
            <>
              <div className="num">{days_left}</div>
              <div className="unit-label">일 남음</div>
            </>
          ) : (
            <div className="none">사용량<br />미입력</div>
          )}
        </div>
      </div>

      <div className="progress-bar">
        <div style={{ width: `${pct}%` }} />
      </div>

      {onStockChange && (
        <div className="stock-controls">
          <button type="button" onClick={onMinus} aria-label="재고 감소">−</button>
          <span className="current">
            {current_stock}
            {max_stock ? ` / ${max_stock}` : ''}
          </span>
          <button type="button" onClick={onPlus} aria-label="재고 증가">＋</button>
          {onDelete && (
            <button
              type="button"
              className="delete-btn"
              onClick={onDeleteClick}
              aria-label="삭제"
            >
              🗑
            </button>
          )}
        </div>
      )}

      {onRefresh && (
        <button
          type="button"
          className="refresh-btn"
          onClick={() => onRefresh(item)}
        >
          💰 최저가 비교
        </button>
      )}
    </div>
  )
}
