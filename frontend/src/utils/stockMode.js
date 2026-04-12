// 감각모드 (sense) / 정확모드 (exact) 재고 표시
export const SENSE_LEVELS = [
  { key: 'critical', label: '거의없음', icon: '❗', days: 7 },
  { key: 'low',      label: '조금',     icon: '📉', days: 14 },
  { key: 'good',     label: '충분',     icon: '✅', days: 30 },
  { key: 'plenty',   label: '많음',     icon: '📦', days: 60 },
]

export function senseToStock(senseKey, dailyUsage) {
  const du = Number(dailyUsage) || 0.03
  const level = SENSE_LEVELS.find((l) => l.key === senseKey)
  if (!level) return Math.round(du * 30)
  return Math.round(du * level.days)
}

export function stockToSense(daysLeft) {
  if (daysLeft == null) return 'good'
  if (daysLeft < 7.5) return 'critical'
  if (daysLeft < 14.5) return 'low'
  if (daysLeft < 30.5) return 'good'
  return 'plenty'
}

export function getSenseLevel(key) {
  return SENSE_LEVELS.find((l) => l.key === key) || SENSE_LEVELS[2]
}
