// 재고/소비량 표시 포맷터

export function formatDaysLeft(days) {
  if (days == null) return null
  const d = Math.max(0, Math.round(Number(days)))
  if (d <= 7) return { days: d, color: '#EF4444', level: 'urgent' }
  if (d <= 30) return { days: d, color: '#F97316', level: 'warning' }
  return { days: d, color: '#1A7A4A', level: 'safe' }
}

export function formatDailyUsage(du) {
  if (du == null || du <= 0) return null
  if (du >= 1) {
    const perDay = Math.round(du)
    return perDay <= 1 ? '매일 1개 소비' : `하루 ${perDay}개 소비`
  }
  const days = Math.max(1, Math.round(1 / du))
  return `${days}일에 1개 소비`
}
