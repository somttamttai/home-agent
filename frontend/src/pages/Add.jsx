import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'

const FIELDS = [
  { key: 'name',          label: '상품명',        type: 'text',   required: true,
    placeholder: '예: 크리넥스 화장지' },
  { key: 'brand',         label: '브랜드',        type: 'text',
    placeholder: '예: 유한킴벌리' },
  { key: 'spec',          label: '규격',          type: 'text',
    placeholder: '예: 3겹 30m 30롤' },
  { key: 'max_stock',     label: '최대 보관 수량', type: 'number',
    placeholder: '예: 30', step: 'any' },
  { key: 'current_stock', label: '현재 재고',     type: 'number', required: true,
    placeholder: '예: 20', step: 'any' },
  { key: 'daily_usage',   label: '일일 소비량',   type: 'number',
    placeholder: '예: 0.5 (하루 반롤)', step: 'any' },
  { key: 'reorder_point', label: '재주문 시점 (일)', type: 'number',
    placeholder: '예: 7 (7일치 남았을 때 알림)', step: 'any' },
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
      <div className="card">
        <b>➕ 소모품 추가</b>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          재주문 시점(일)은 남은 일수가 이 값 이하일 때 알림을 받아요.
        </div>
      </div>

      <div className="card">
        {FIELDS.map((f) => (
          <label key={f.key} className="form-row">
            <span>
              {f.label}
              {f.required && <span style={{ color: '#ef4444' }}> *</span>}
            </span>
            <input
              type={f.type}
              value={form[f.key]}
              onChange={setField(f.key)}
              placeholder={f.placeholder}
              step={f.step}
              inputMode={f.type === 'number' ? 'decimal' : undefined}
              required={f.required}
            />
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn secondary"
          style={{ flex: 1 }}
          onClick={() => nav('/')}
          disabled={saving}
        >
          취소
        </button>
        <button type="submit" className="btn" style={{ flex: 2 }} disabled={saving}>
          {saving ? '저장중…' : '💾 저장'}
        </button>
      </div>
    </form>
  )
}
