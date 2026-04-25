import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useCategories } from '../hooks/useCategories.jsx'
import { useConsumables } from '../hooks/useConsumables.jsx'
import { calcDailyUsage, expectedDays, getBaselineDays } from '../utils/consumption.js'
import { effectivePeople, formatPeople } from '../utils/family.js'


const FIELDS = [
  { key: 'name',          label: '상품명',           type: 'text',   required: true,  placeholder: '예: 크리넥스 화장지' },
  { key: 'brand',         label: '브랜드',           type: 'text',                    placeholder: '예: 유한킴벌리' },
  { key: 'spec',          label: '규격',             type: 'text',                    placeholder: '예: 3겹 30m 30롤' },
  { key: 'max_stock',     label: '최대 보관 수량',    type: 'number',                  placeholder: '30',  step: 'any' },
  { key: 'current_stock', label: '현재 재고',         type: 'number', required: true,  placeholder: '20',  step: 'any' },
  { key: 'daily_usage',   label: '일일 소비량',       type: 'number',                  placeholder: '0.5 (하루 반롤)', step: 'any' },
  { key: 'reorder_point', label: '재주문 시점 (일)',  type: 'number',                  placeholder: '7',   step: 'any' },
]

function emptyManual(sp) {
  return {
    name: sp.get('name') || '',
    brand: sp.get('brand') || '',
    spec: sp.get('spec') || '',
    category: sp.get('category') || '기타',
    max_stock: '',
    current_stock: '',
    daily_usage: '',
    reorder_point: '',
  }
}

// ───────────────────────────────────────────────────────────────────────
// 직접 입력 탭
// ───────────────────────────────────────────────────────────────────────
function ManualForm({ initial, onSaved }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const { categoryKeys, templateGroups, family: famData } = useCategories()
  const { items, onUpdate } = useConsumables()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [dupe, setDupe] = useState(null) // { existing, newCategory } | null

  const family = { adults: famData.adults, children: famData.children }
  const people = effectivePeople(family)

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const applyTemplate = (t, category) => {
    // 가족 인원 기준 일일 소비량 자동 계산 (baseline 없으면 템플릿 fallback)
    const auto = calcDailyUsage(t.name, family)
    const dailyUsage =
      auto != null ? auto : (t.daily_usage != null ? t.daily_usage : null)

    setForm((f) => ({
      ...f,
      name: t.name,
      brand: t.brand || '',
      spec: t.spec || '',
      category,
      daily_usage: dailyUsage != null ? String(dailyUsage) : '',
      reorder_point: t.reorder_point != null ? String(t.reorder_point) : '',
    }))
    toast(`✨ ${t.name} 템플릿 적용됨`)
  }

  // 현재 입력된 상품명에 baseline 이 있으면 안내문구 표시
  const hintDays = useMemo(() => {
    if (!form.name || !getBaselineDays(form.name)) return null
    return expectedDays(form.name, family)
  }, [form.name, family])

  const findDuplicate = (name, category) => {
    const n = name.trim().toLowerCase()
    if (!n) return null
    for (const it of items) {
      if ((it.name || '').trim().toLowerCase() !== n) continue
      const linked = Array.isArray(it.linked_categories) ? it.linked_categories : []
      const alreadyIn = (it.category || '기타') === category || linked.includes(category)
      return { item: it, alreadyIn }
    }
    return null
  }

  const buildPayload = () => ({
    name: form.name.trim(),
    brand: form.brand.trim() || null,
    spec: form.spec.trim() || null,
    category: form.category || '기타',
    max_stock: form.max_stock ? Number(form.max_stock) : null,
    current_stock: form.current_stock ? Number(form.current_stock) : 0,
    daily_usage: form.daily_usage ? Number(form.daily_usage) : null,
    reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
  })

  const saveNewItem = async () => {
    const payload = buildPayload()
    setSaving(true)
    try {
      const r = await fetch('/api/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      toast(`✅ "${payload.name}" 추가됨`)
      onSaved()
    } catch (err) {
      toast(`❌ 저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const linkToExisting = async () => {
    if (!dupe) return
    const { existing, newCategory } = dupe
    const linked = Array.isArray(existing.linked_categories) ? existing.linked_categories : []
    setSaving(true)
    try {
      await onUpdate(existing, { linked_categories: [...linked, newCategory] })
      toast(`📋 "${existing.name}" 를 "${newCategory}" 에 연동했어요`)
      setDupe(null)
      onSaved()
    } catch (err) {
      toast(`❌ 연동 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast('상품명을 입력해주세요')
      return
    }
    const targetCat = form.category || '기타'
    const found = findDuplicate(form.name, targetCat)
    if (found) {
      if (found.alreadyIn) {
        toast(`이미 "${targetCat}"에 있는 소모품이에요`)
        return
      }
      setDupe({ existing: found.item, newCategory: targetCat })
      return
    }
    await saveNewItem()
  }

  return (
    <form onSubmit={onSubmit} className="page-enter">
      <div className="section-title" style={{ paddingTop: 0 }}>템플릿에서 빠르게 추가하기</div>
      {templateGroups.map((group) => (
        <div className="template-group" key={group.category}>
          <div className="template-group-header">
            <span className="template-group-icon">{group.icon}</span>
            <span className="template-group-name">{group.category}</span>
          </div>
          <div className="quick-chips">
            {group.templates.map((t) => (
              <button
                key={`${group.category}-${t.name}`}
                type="button"
                className="quick-chip"
                onClick={() => applyTemplate(t, group.category)}
              >
                <span className="emoji">{t.icon}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="section-title">상세 입력</div>

      {/* 상품명 / 브랜드 / 규격 */}
      {FIELDS.slice(0, 3).map((f) => (
        <div key={f.key} className="form-field">
          <label className="label" htmlFor={`field-${f.key}`}>
            {f.label}
            {f.required && <span className="required">*</span>}
          </label>
          <input
            id={`field-${f.key}`}
            type={f.type}
            value={form[f.key]}
            onChange={setField(f.key)}
            placeholder={f.placeholder}
            required={f.required}
          />
        </div>
      ))}

      {/* 카테고리 드롭다운 */}
      <div className="form-field">
        <label className="label" htmlFor="field-category">카테고리</label>
        <select
          id="field-category"
          value={form.category}
          onChange={setField('category')}
        >
          {categoryKeys.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 수량 / 사용량 / 재주문 */}
      {FIELDS.slice(3).map((f) => (
        <div key={f.key} className="form-field">
          <label className="label" htmlFor={`field-${f.key}`}>
            {f.label}
            {f.required && <span className="required">*</span>}
          </label>
          <input
            id={`field-${f.key}`}
            type={f.type}
            value={form[f.key]}
            onChange={setField(f.key)}
            placeholder={f.placeholder}
            step={f.step}
            inputMode={f.type === 'number' ? 'decimal' : undefined}
            required={f.required}
          />
          {f.key === 'daily_usage' && hintDays != null && (
            <div className="form-hint">
              👨‍👩‍👧 {formatPeople(people)}인 기준 약 {hintDays}일 소비 예상
            </div>
          )}
        </div>
      ))}

      <div className="bottom-action">
        <button type="submit" className="btn block lg" disabled={saving}>
          {saving ? '저장중…' : '💾 저장하기'}
        </button>
      </div>

      <Modal
        open={!!dupe}
        onClose={() => setDupe(null)}
        title="이미 있는 상품이에요"
        actions={
          <button type="button" className="btn secondary"
            onClick={() => setDupe(null)} disabled={saving}>
            취소
          </button>
        }
      >
        {dupe && (
          <div className="dupe-body">
            <div className="dupe-msg">
              "<strong>{dupe.existing.name}</strong>"은(는) 이미
              {' '}"<strong>{dupe.existing.category || '기타'}</strong>" 카테고리에 있어요.
            </div>
            <div className="dupe-actions">
              <button type="button" className="btn block tap-btn"
                onClick={linkToExisting} disabled={saving}>
                📋 "{dupe.newCategory}" 에도 연동하기
                <div className="dupe-hint">재고·소비량 공유 (한 개의 소모품으로 관리)</div>
              </button>
              <button type="button" className="btn secondary block tap-btn"
                onClick={() => { setDupe(null); saveNewItem() }} disabled={saving}>
                ➕ 별개 소모품으로 새로 추가하기
                <div className="dupe-hint">재고 따로 관리</div>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </form>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 쿠팡 붙여넣기 탭
// ───────────────────────────────────────────────────────────────────────
const PASTE_PLACEHOLDER = `[크리넥스] 순수 소프트 화장지 3겹 30m 30롤 2팩
피죤 세탁세제 드럼 3kg
2080 치약 120g 3개입`

function PasteForm({ onSaved }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const { categoryKeys } = useCategories()
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parser, setParser] = useState(null)
  const [items, setItems] = useState(null)
  const [saving, setSaving] = useState(false)

  const onParse = async () => {
    if (!text.trim()) {
      toast('붙여넣을 내용을 입력해주세요')
      return
    }
    setParsing(true)
    try {
      const r = await fetch('/api/scan/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const withStock = (data.items || []).map((it) => ({
        ...it,
        category: '기타',
        current_stock: '',
        max_stock: '',
      }))
      setParser(data.parser)
      setItems(withStock)
      if (withStock.length === 0) toast('인식된 상품이 없어요')
    } catch (e) {
      toast(`❌ 분석 실패: ${e.message}`)
    } finally {
      setParsing(false)
    }
  }

  const updateItem = (idx, patch) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  const removeItem = (idx) => setItems((arr) => arr.filter((_, i) => i !== idx))
  const reset = () => { setItems(null); setParser(null); setText('') }

  const onSaveAll = async () => {
    if (!items || items.length === 0) return
    setSaving(true)
    let ok = 0, fail = 0
    for (const it of items) {
      try {
        const payload = {
          name: it.name,
          brand: it.brand || null,
          spec: it.spec || null,
          category: it.category || '기타',
          current_stock: it.current_stock ? Number(it.current_stock) : 0,
          max_stock: it.max_stock ? Number(it.max_stock) : null,
        }
        const r = await fetch('/api/consumables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload),
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        ok++
      } catch {
        fail++
      }
    }
    setSaving(false)
    if (fail === 0) {
      toast(`✅ ${ok}개 모두 저장됨`)
      onSaved()
    } else {
      toast(`⚠️ ${ok}개 저장, ${fail}개 실패`)
    }
  }

  if (!items) {
    return (
      <div>
        <div className="section-title" style={{ paddingTop: 0 }}>주문내역 붙여넣기</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12, lineHeight: 1.5 }}>
          쿠팡 앱 → 주문내역 → 상품명 복사해서 붙여넣어주세요.<br />
          한 줄에 하나씩, 여러 상품을 한꺼번에 추가할 수 있어요.
        </div>
        <textarea
          className="textarea-big"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PASTE_PLACEHOLDER}
          rows={8}
        />
        <div className="bottom-action">
          <button
            type="button"
            className="btn block lg"
            onClick={onParse}
            disabled={parsing || !text.trim()}
          >
            {parsing ? '분석중…' : '🔍 분석하기'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title" style={{ paddingTop: 0 }}>
        분석 결과 ({items.length}개)
        {parser === 'simple' && (
          <span style={{ color: 'var(--text-hint)', fontWeight: 600, marginLeft: 8 }}>
            · 간단 파싱
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 12 }}>
        각 상품의 카테고리와 재고를 입력하세요. 잘못 인식된 항목은 ✕ 로 제외할 수 있어요.
      </div>

      {items.map((it, idx) => (
        <div key={idx} className="parsed-card">
          <div className="parsed-card-top">
            <div style={{ minWidth: 0, flex: 1 }}>
              {it.brand && <div className="brand">{it.brand}</div>}
              <div className="name">{it.name}</div>
              {it.spec && <div className="spec">{it.spec}</div>}
            </div>
            <button
              type="button"
              className="remove-btn"
              onClick={() => removeItem(idx)}
              aria-label="제외"
            >
              ✕
            </button>
          </div>

          <div className="form-field" style={{ marginBottom: 10 }}>
            <span className="label-prefix">카테고리</span>
            <select
              value={it.category}
              onChange={(e) => updateItem(idx, { category: e.target.value })}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg)',
                fontSize: 15, fontWeight: 600, color: 'var(--text)',
              }}
            >
              {categoryKeys.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="stock-inputs">
            <label>
              <span className="label-prefix">현재 재고</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={it.current_stock}
                onChange={(e) => updateItem(idx, { current_stock: e.target.value })}
                placeholder="0"
              />
            </label>
            <label>
              <span className="label-prefix">최대 재고</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={it.max_stock}
                onChange={(e) => updateItem(idx, { max_stock: e.target.value })}
                placeholder="-"
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn tonal block"
        style={{ marginTop: 8 }}
        onClick={reset}
      >
        ← 다시 입력하기
      </button>

      <div className="bottom-action">
        <button
          type="button"
          className="btn block lg"
          onClick={onSaveAll}
          disabled={saving || items.length === 0}
        >
          {saving ? '저장중…' : `💾 ${items.length}개 전체 저장`}
        </button>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 최상위 — 탭 스위처
// ───────────────────────────────────────────────────────────────────────
export default function Add() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState('manual')

  const onSaved = () => nav('/')

  return (
    <div>
      <PageHeader title="소모품 추가" />
      <div className="page">
        <div className="tab-switcher">
          <button
            type="button"
            className={tab === 'manual' ? 'active' : ''}
            onClick={() => setTab('manual')}
          >
            직접 입력
          </button>
          <button
            type="button"
            className={tab === 'paste' ? 'active' : ''}
            onClick={() => setTab('paste')}
          >
            쿠팡 붙여넣기
          </button>
        </div>

        {tab === 'manual'
          ? <ManualForm initial={emptyManual(sp)} onSaved={onSaved} />
          : <PasteForm onSaved={onSaved} />}
      </div>
    </div>
  )
}
