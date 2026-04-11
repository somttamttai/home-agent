// 1인 성인 기준 소비일수 (= 한 단위가 며칠동안 가는지)
// 템플릿 이름과 정확히 매칭됨 (Add.jsx 템플릿 카탈로그와 동기화)
import { effectivePeople } from './family.js'

export const BASELINE_DAYS = {
  // 욕실
  '화장지':       60,
  '샴푸':         30,
  '린스':         45,
  '바디워시':     30,
  '치약':         45,
  '칫솔':         90,
  '면도기':       90,
  '욕실세제':     60,
  '변기세정제':   90,

  // 주방
  '주방세제':       60,
  '수세미':         30,
  '키친타올':       20,
  '랩':             90,
  '지퍼백':         30,
  '알루미늄호일':   90,
  '식기세척기세제': 60,

  // 세탁실
  '세탁세제':     90,
  '섬유유연제':   60,
  '표백제':       120,
  '드라이시트':   40,

  // 청소
  '쓰레기봉투':   25,
  '청소포':       15,
  '락스':         60,
  '먼지떨이':     180,
  '고무장갑':     60,

  // 침실
  '방향제':       30,
  '섬유탈취제':   30,
  '모기향':       60,

  // 드레스룸
  '방충제':       180,
  '옷걸이':       365,
}

// 해당 품목의 1인 기준 소비일수 (없으면 null)
export function getBaselineDays(name) {
  if (!name) return null
  return BASELINE_DAYS[name.trim()] ?? null
}

// 가족 인원에 맞춘 일일 소비량 계산
//   유효인원 = 성인 + 어린이*0.7
//   daily_usage = 1 / (기준일 / 유효인원) = 유효인원 / 기준일
//   소수점 4자리 반올림
export function calcDailyUsage(name, family) {
  const days = getBaselineDays(name)
  if (!days) return null
  const people = effectivePeople(family)
  if (people <= 0) return null
  return Math.round((people / days) * 10000) / 10000
}

// 우리 가족 기준 예상 소비일수 (= 기준일 / 유효인원)
export function expectedDays(name, family) {
  const days = getBaselineDays(name)
  if (!days) return null
  const people = effectivePeople(family)
  if (people <= 0) return null
  return Math.round(days / people)
}
