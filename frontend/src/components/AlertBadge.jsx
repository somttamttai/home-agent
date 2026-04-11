export default function AlertBadge({ daysLeft, reorderPoint }) {
  if (daysLeft == null) {
    return <span className="alert-badge safe">정보 없음</span>
  }
  const danger = daysLeft <= reorderPoint
  return (
    <span className={`alert-badge ${danger ? 'danger' : 'safe'}`}>
      {danger ? '⚠️ 주문필요' : '✅ 여유'}
    </span>
  )
}
