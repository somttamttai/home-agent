import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

const QTY_OPTIONS = [1, 2, 3, 4]

function QtyPicker({ value, onChange }) {
  const [custom, setCustom] = useState(false)

  if (custom) {
    return (
      <input
        type="number"
        inputMode="numeric"
        min="1"
        autoFocus
        className="qty-custom-input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
        onBlur={() => { if (value <= 0) onChange(1) }}
      />
    )
  }

  return (
    <div className="qty-picker">
      {QTY_OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          className={`qty-btn ${value === n ? 'active' : ''}`}
          onClick={() => onChange(n)}
        >
          {n}개
        </button>
      ))}
      <button
        type="button"
        className="qty-btn"
        onClick={() => setCustom(true)}
      >
        직접
      </button>
    </div>
  )
}

export default function PurchaseCompleteModal({ open, onClose, items, onStockChange }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [checked, setChecked] = useState({})
  const [quantities, setQuantities] = useState({})
  const [saving, setSaving] = useState(false)

  // 재주문 필요한 아이템 우선 정렬
  const sorted = [...items].sort((a, b) => {
    if (a.need_reorder && !b.need_reorder) return -1
    if (!a.need_reorder && b.need_reorder) return 1
    return (a.days_left ?? 999) - (b.days_left ?? 999)
  })

  useEffect(() => {
    if (open) {
      setChecked({})
      setQuantities({})
    }
  }, [open])

  const toggle = (id) => {
    setChecked((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = true
        if (!quantities[id]) setQuantities((q) => ({ ...q, [id]: 1 }))
      }
      return next
    })
  }

  const setQty = (id, qty) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }))
  }

  const checkedCount = Object.keys(checked).length

  const handleConfirm = useCallback(async () => {
    if (checkedCount === 0) {
      onClose()
      return
    }
    setSaving(true)
    const results = []
    try {
      for (const item of sorted) {
        if (!checked[item.id]) continue
        const qty = quantities[item.id] || 1
        const newStock = Number(item.current_stock) + qty

        // 재고 업데이트
        await onStockChange(item, newStock)

        // purchase_history 저장
        const purchaseBody = {
          consumable_id: item.id,
          quantity: qty,
          purchase_type: 'normal',
          days_before_depletion: item.days_left,
        }
        const r = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(purchaseBody),
        })
        if (r.ok) {
          const purchase = await r.json()
          results.push({ item, purchase, qty })
        }
      }
      toast(`${results.length}개 상품 재고가 업데이트됐어요`)
      onClose(results)
    } catch (e) {
      toast(`일부 저장 실패: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }, [checked, quantities, sorted, onStockChange, authHeaders, toast, onClose, checkedCount])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="구매 완료하셨나요?"
      actions={
        <>
          <button type="button" className="btn secondary" onClick={() => onClose()} disabled={saving}>
            아니요
          </button>
          <button type="button" className="btn" onClick={handleConfirm} disabled={saving}>
            {saving ? '저장중...' : checkedCount > 0 ? `${checkedCount}개 확인` : '닫기'}
          </button>
        </>
      }
    >
      <div className="purchase-checklist">
        <div className="purchase-hint">산 것만 체크해주세요</div>
        {sorted.map((item) => (
          <div key={item.id} className="purchase-item">
            <label className="purchase-check-row">
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => toggle(item.id)}
              />
              <span className="purchase-name">
                {item.name}
                {item.need_reorder && <span className="purchase-urgent">주문필요</span>}
              </span>
              {item.days_left != null && (
                <span className="purchase-days">{item.days_left}일</span>
              )}
            </label>
            {checked[item.id] && (
              <QtyPicker
                value={quantities[item.id] || 1}
                onChange={(q) => setQty(item.id, q)}
              />
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
