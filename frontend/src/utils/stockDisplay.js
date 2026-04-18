// 재고/소비량 표시 포맷터

export function formatDaysLeft(days) {
  if (days == null) return null
  const d = Math.max(0, Number(days))
  if (d <= 7) {
    return { value: d, unit: '일치', color: '#EF4444', level: 'urgent' }
  }
  if (d <= 30) {
    return { value: Math.round(d / 7), unit: '주치', color: '#F97316', level: 'warning' }
  }
  return { value: Math.round(d / 30), unit: '개월치', color: '#1A7A4A', level: 'safe' }
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
