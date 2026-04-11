import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  DEFAULT_FAMILY,
  effectivePeople,
  formatPeople,
  loadFamily,
  saveFamily,
} from '../utils/family.js'
import { expectedDays } from '../utils/consumption.js'

function Counter({ label, hint, value, onChange, min = 0, max = 99 }) {
  return (
    <div className="counter-row">
      <div className="counter-label">
        <div className="title">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <div className="counter-controls">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`${label} 감소`}
        >
          −
        </button>
        <span className="value">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`${label} 증가`}
        >
          ＋
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const toast = useToast()
  const [form, setForm] = useState(loadFamily)

  const setAdults = (n) => setForm((f) => ({ ...f, adults: n }))
  const setChildren = (n) => setForm((f) => ({ ...f, children: n }))

  const onSave = () => {
    saveFamily(form)
    toast('설정이 저장됐어요 ✅')
  }

  const onResetFamily = () => setForm(DEFAULT_FAMILY)

  const people = effectivePeople(form)
  const initialFamily = loadFamily()
  const isFamilyDirty =
    form.adults !== initialFamily.adults || form.children !== initialFamily.children

  return (
    <div>
      <PageHeader title="설정" />
      <div className="page">
        <div className="section-title" style={{ paddingTop: 0 }}>
          가족 구성원
        </div>

        <Counter
          label="성인"
          hint="13세 이상"
          value={form.adults}
          onChange={setAdults}
        />
        <Counter
          label="어린이"
          hint="12세 이하 · 성인의 0.7배 가중치"
          value={form.children}
          onChange={setChildren}
        />

        <div
          className="card"
          style={{ borderColor: 'var(--primary)', borderWidth: 1.5 }}
        >
          <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
            👨‍👩‍👧 유효 인원
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'var(--primary)',
              letterSpacing: '-0.03em',
              marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {formatPeople(people)}
            <span style={{ fontSize: 18, marginLeft: 2 }}>인</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-sub)',
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            성인 {form.adults}명 + 어린이 {form.children}명 × 0.7
          </div>

          {people > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-sub)',
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                예상 소비 일수
              </div>
              {[
                ['🧻', '화장지 30롤', '화장지'],
                ['🪥', '치약 120g', '치약'],
                ['🧻', '키친타올 150매', '키친타올'],
                ['🧴', '세탁세제 3kg', '세탁세제'],
              ].map(([icon, label, key]) => (
                <div
                  key={key}
                  style={{
                    fontSize: 13,
                    color: 'var(--text)',
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{icon} {label}</span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--primary)',
                    }}
                  >
                    약 {expectedDays(key, form)}일
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isFamilyDirty && (
          <button
            type="button"
            className="btn secondary block"
            style={{ marginTop: 12 }}
            onClick={onResetFamily}
          >
            ↺ 가족 인원 되돌리기
          </button>
        )}

        <div className="section-title" style={{ marginTop: 24 }}>안내</div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            가족 인원을 설정하면 소모품 추가 시 일일 소비량이 자동으로 계산돼요.
            템플릿을 선택하면 기준 소비속도에 우리 가족 인원을 곱한 값이 들어갑니다.
            언제든 직접 수정할 수 있어요.
            <br /><br />
            🏷️ <b>선호 브랜드</b>는 각 소모품 카드의 ⋯ 메뉴에서 직접 설정할 수 있어요.
          </div>
        </div>
      </div>

      <div className="bottom-action">
        <button type="button" className="btn block lg" onClick={onSave}>
          💾 저장하기
        </button>
      </div>
    </div>
  )
}
