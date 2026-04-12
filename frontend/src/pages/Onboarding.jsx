import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/Toast.jsx'
import { effectivePeople } from '../utils/family.js'
import { ALL_CATEGORIES, ITEMS_BY_CATEGORY } from '../utils/onboardingData.js'
import { SENSE_LEVELS, senseToStock } from '../utils/stockMode.js'

const TOTAL_STEPS = 5

function ProgressBar({ step }) {
  return (
    <div className="ob-progress">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`ob-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} />
      ))}
    </div>
  )
}

function Counter({ label, hint, value, onChange, min = 0 }) {
  return (
    <div className="counter-row">
      <div className="counter-label">
        <div className="title">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <div className="counter-controls">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="value">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}>＋</button>
      </div>
    </div>
  )
}

// ── Step 1: 가족 구성원 ───────────────────────────────────────
function StepFamily({ family, setFamily }) {
  return (
    <div className="ob-step">
      <div className="ob-title">몇 명이 함께 사세요?</div>
      <Counter
        label="성인" hint="13세 이상"
        value={family.adults}
        onChange={(n) => setFamily((f) => ({ ...f, adults: n }))}
        min={1}
      />
      <Counter
        label="어린이" hint="4~12세"
        value={family.children}
        onChange={(n) => setFamily((f) => ({ ...f, children: n }))}
      />
      <Counter
        label="유아" hint="0~3세"
        value={family.infants}
        onChange={(n) => setFamily((f) => ({ ...f, infants: n }))}
      />
      {family.infants > 0 && (
        <div className="ob-hint-card">유아용품 카테고리가 추가돼요</div>
      )}
    </div>
  )
}

// ── Step 2: 카테고리 선택 ─────────────────────────────────────
function StepCategories({ selected, setSelected, hasInfant }) {
  const cats = useMemo(
    () => ALL_CATEGORIES.filter((c) => !c.infant || hasInfant),
    [hasInfant],
  )

  useEffect(() => {
    if (hasInfant && !selected.includes('유아용품')) {
      setSelected((s) => [...s, '유아용품'])
    }
  }, [hasInfant, selected, setSelected])

  const toggle = (key) => {
    setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key])
  }

  return (
    <div className="ob-step">
      <div className="ob-title">어떤 공간의 소모품을 관리할까요?</div>
      <div className="ob-cat-grid">
        {cats.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`ob-cat-card ${selected.includes(c.key) ? 'selected' : ''}`}
            onClick={() => toggle(c.key)}
          >
            <span className="icon">{c.icon}</span>
            <span className="label">{c.key}</span>
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <div className="ob-warn">최소 1개 카테고리를 선택해주세요</div>
      )}
    </div>
  )
}

// ── Step 3: 소모품 선택 ───────────────────────────────────────
function StepItems({ categories, selectedItems, setSelectedItems }) {
  const toggleItem = (cat, name) => {
    setSelectedItems((s) => {
      const key = `${cat}::${name}`
      const next = { ...s }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  const toggleAll = (cat) => {
    const items = ITEMS_BY_CATEGORY[cat] || []
    const allSelected = items.every((it) => selectedItems[`${cat}::${it.name}`])
    setSelectedItems((s) => {
      const next = { ...s }
      for (const it of items) {
        const key = `${cat}::${it.name}`
        if (allSelected) delete next[key]
        else next[key] = true
      }
      return next
    })
  }

  return (
    <div className="ob-step">
      <div className="ob-title">어떤 소모품을 관리할까요?</div>
      <div className="ob-subtitle">탭해서 선택하세요</div>
      {categories.map((cat) => {
        const items = ITEMS_BY_CATEGORY[cat] || []
        if (items.length === 0) return null
        const catInfo = ALL_CATEGORIES.find((c) => c.key === cat)
        const allSelected = items.every((it) => selectedItems[`${cat}::${it.name}`])
        return (
          <div key={cat} className="ob-item-section">
            <div className="ob-section-header">
              <span>{catInfo?.icon} {cat}</span>
              <button
                type="button"
                className="ob-select-all"
                onClick={() => toggleAll(cat)}
              >
                {allSelected ? '전체해제' : '전체선택'}
              </button>
            </div>
            <div className="ob-chips">
              {items.map((it) => {
                const key = `${cat}::${it.name}`
                const on = !!selectedItems[key]
                return (
                  <button
                    key={key}
                    type="button"
                    className={`ob-chip ${on ? 'selected' : ''}`}
                    onClick={() => toggleItem(cat, it.name)}
                  >
                    {it.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step 4: 초기 재고 상태 ────────────────────────────────────
function StepStock({ selectedItems, stockLevels, setStockLevels }) {
  const entries = useMemo(
    () => Object.keys(selectedItems).map((key) => {
      const [cat, name] = key.split('::')
      const items = ITEMS_BY_CATEGORY[cat] || []
      const item = items.find((it) => it.name === name)
      return { key, cat, name, item }
    }).filter((e) => e.item),
    [selectedItems],
  )

  return (
    <div className="ob-step">
      <div className="ob-title">지금 집에 얼마나 있어요?</div>
      <div className="ob-subtitle">대략적으로 탭해주세요 (기본: 충분)</div>
      <div className="ob-stock-list">
        {entries.map(({ key, name }) => {
          const current = stockLevels[key] || 'good'
          return (
            <div key={key} className="ob-stock-row">
              <div className="ob-stock-name">{name}</div>
              <div className="ob-sense-btns">
                {SENSE_LEVELS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    className={`ob-sense-btn ${current === l.key ? 'active' : ''} ${l.key}`}
                    onClick={() => setStockLevels((s) => ({ ...s, [key]: l.key }))}
                  >
                    <span className="icon">{l.icon}</span>
                    <span className="text">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 5: 완료 ──────────────────────────────────────────────
function StepDone({ count, saving }) {
  return (
    <div className="ob-step ob-done">
      <div className="ob-done-icon">✅</div>
      <div className="ob-done-title">{count}개 소모품이 등록됐어요!</div>
      <div className="ob-done-sub">재고는 언제든 탭으로 수정할 수 있어요</div>
      {saving && <div className="ob-done-sub">저장 중...</div>}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────
export default function Onboarding() {
  const { authHeaders, refreshHousehold } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [family, setFamily] = useState({ adults: 2, children: 0, infants: 0 })
  const [categories, setCategories] = useState(
    ALL_CATEGORIES.filter((c) => c.default).map((c) => c.key),
  )
  const [selectedItems, setSelectedItems] = useState({})
  const [stockLevels, setStockLevels] = useState({})

  // step 2→3 넘어갈 때 기본 선택 세팅
  useEffect(() => {
    if (step === 2 && Object.keys(selectedItems).length === 0) {
      const init = {}
      for (const cat of categories) {
        const items = ITEMS_BY_CATEGORY[cat] || []
        for (const it of items) {
          init[`${cat}::${it.name}`] = true
        }
      }
      setSelectedItems(init)
    }
  }, [step, categories, selectedItems])

  const itemCount = Object.keys(selectedItems).length

  const canNext = useMemo(() => {
    if (step === 0) return family.adults >= 1
    if (step === 1) return categories.length > 0
    if (step === 2) return itemCount > 0
    return true
  }, [step, family, categories, itemCount])

  const onNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1)
  }
  const onBack = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const onFinish = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      // 1) 가족설정 저장
      await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(family),
      })

      // 2) 소모품 일괄 등록
      const people = effectivePeople({ adults: family.adults, children: family.children })
      const entries = Object.keys(selectedItems)
      let ok = 0
      for (const key of entries) {
        const [cat, name] = key.split('::')
        const items = ITEMS_BY_CATEGORY[cat] || []
        const tmpl = items.find((it) => it.name === name)
        if (!tmpl) continue

        const dailyUsage = people > 0 && tmpl.baselineDays > 0
          ? Math.round((people / tmpl.baselineDays) * 10000) / 10000
          : 0.03
        const sense = stockLevels[key] || 'good'
        const currentStock = senseToStock(sense, dailyUsage)
        const reorderPoint = 7

        await fetch('/api/consumables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            name: tmpl.name,
            brand: tmpl.brand || null,
            spec: tmpl.spec || null,
            category: cat,
            current_stock: currentStock,
            daily_usage: dailyUsage,
            reorder_point: reorderPoint,
          }),
        })
        ok++
      }

      // 3) onboarded 표시
      await fetch('/api/auth/onboarded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      })

      setDone(true)
      toast(`${ok}개 소모품이 등록됐어요!`)
      await refreshHousehold()
    } catch (e) {
      toast(`❌ 저장 실패: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }, [saving, authHeaders, family, selectedItems, stockLevels, toast, refreshHousehold])

  // step 4(완료)에서 자동 저장
  useEffect(() => {
    if (step === 4 && !done && !saving) onFinish()
  }, [step, done, saving, onFinish])

  return (
    <div className="ob-page">
      <ProgressBar step={step} />

      <div className="ob-body">
        {step === 0 && <StepFamily family={family} setFamily={setFamily} />}
        {step === 1 && (
          <StepCategories
            selected={categories}
            setSelected={setCategories}
            hasInfant={family.infants > 0}
          />
        )}
        {step === 2 && (
          <StepItems
            categories={categories}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />
        )}
        {step === 3 && (
          <StepStock
            selectedItems={selectedItems}
            stockLevels={stockLevels}
            setStockLevels={setStockLevels}
          />
        )}
        {step === 4 && <StepDone count={itemCount} saving={saving} />}
      </div>

      <div className="ob-footer">
        {step > 0 && step < 4 && (
          <button type="button" className="btn secondary" onClick={onBack}>
            이전
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            className="btn"
            onClick={onNext}
            disabled={!canNext}
            style={{ marginLeft: 'auto' }}
          >
            다음
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            className="btn"
            onClick={onNext}
            style={{ marginLeft: 'auto' }}
          >
            완료
          </button>
        )}
        {step === 4 && done && (
          <button
            type="button"
            className="btn block lg"
            onClick={() => window.location.reload()}
          >
            시작하기
          </button>
        )}
      </div>
    </div>
  )
}
