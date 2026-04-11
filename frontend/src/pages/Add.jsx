import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'

const FIELDS = [
  { key: 'name',          label: '상품명',        type: 'text',   required: true,
    placeholder: '예: 크리넥스 화장지' },
  { key: 'brand',         label: '브랜드',        type: 'text',
    placeholder: '예: 유한킴벌리' },
  { key: 'spec',          label: '규격',          type: 'text',
    placeholder: '예: 3겹 30m 30롤' },
  { key: 'max_stock',     label: '최대 보관 수량', type: 'number',
    placeholder: '30', step: 'any' },
  { key: 'current_stock', label: '현재 재고',     type: 'number', required: true,
    placeholder: '20', step: 'any' },
  { key: 'daily_usage',   label: '일일 소비량',   type: 'number',
    placeholder: '0.5 (하루 반롤)', step: 'any' },
  { key: 'reorder_point', label: '재주문 시점 (일)', type: 'number',
    placeholder: '7 (7일치 남았을 때 알림)', step: 'any' },
]

export default function Add() {
  const nav = useNavigate()
  const toast = useToast()
  const [sp] = useSearchParams()

  const [form, setForm] = useState({
    name: sp.get('name') || '',
    brand: sp.get('brand') || '',
    spec: sp.get('spec') || '',
    max_stock: '', current_stock: '', daily_usage: '', reorder_point: '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast('상품명을 입력해주세요')
      return
    }
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      spec: form.spec.trim() || null,
      max_stock: form.max_stock ? Number(form.max_stock) : null,
      current_stock: form.current_stock ? Number(form.current_stock) : 0,
      daily_usage: form.daily_usage ? Number(form.daily_usage) : null,
      reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
    }

    setSaving(true)
    try {
      const r = await fetch('/api/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      toast(`✅ "${payload.name}" 추가됨`)
      nav('/')
    } catch (err) {
      toast(`❌ 저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader title="소모품 추가" />
      <div className="page">
        <div style={{ padding: '4px 4px 20px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            어떤 소모품을 추가할까요?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 6 }}>
            이름만 있어도 저장돼요. 사용량을 넣으면 소진 예상일을 알려드려요.
          </div>
        </div>

        {FIELDS.map((f) => (
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
          </div>
        ))}
      </div>

      <div className="bottom-action">
        <button
          type="submit"
          className="btn block lg"
          disabled={saving}
        >
          {saving ? '저장중…' : '💾 저장하기'}
        </button>
      </div>
    </form>
  )
}
