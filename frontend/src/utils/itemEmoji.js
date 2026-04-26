// 상품명 → 이모지 자동 매핑
// 첫 번째 매치를 반환. 매치 없으면 fallback.

const ITEM_EMOJI_MAP = {
  '화장지': '🧻',
  '두루마리': '🧻',
  '키친타올': '🧻',
  '샴푸': '🚿',
  '린스': '🧴',
  '바디워시': '🧴',
  '바디로션': '🧴',
  '욕실세제': '🫧',
  '변기세제': '🚽',
  '생리대': '🩸',
  '치약': '🪥',
  '칫솔': '🪥',
  '세탁세제': '🧺',
  '섬유유연제': '🧺',
  '주방세제': '🧼',
  '종량제봉투': '🗑️',
  '쓰레기봉투': '🗑️',
  '물티슈': '💧',
  '마스크': '😷',
  '밴드': '🩹',
  '면도기': '🪒',
  '면도날': '🪒',
  '비누': '🧼',
  '핸드워시': '🧼',
  '랩': '📦',
  '호일': '📦',
  '지퍼백': '📦',
  '건전지': '🔋',
}

export function getItemEmoji(name, fallback = '📦') {
  if (!name) return fallback
  for (const [key, emoji] of Object.entries(ITEM_EMOJI_MAP)) {
    if (name.includes(key)) return emoji
  }
  return fallback
}
