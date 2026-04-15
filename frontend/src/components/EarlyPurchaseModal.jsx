import { useState } from 'react'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

export default function EarlyPurchaseModal({ open, onClose, detections, onStockChange }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [current, setCurrent] = useState(0)
  const [saving, setSaving] = useState(false)

  if (!detections || detections.length === 0) return null

  const det = detections[current]
  if (!det) return null

  const handleChoice = async (choice) => {
    setSaving(true)
    try {
      // choice: 'event' | 'early' | 'normal'
      if (det.purchase?.id) {
        await fetch(`/api/purchases/${det.purchase.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ purchase_type: choice }),
        })
      }

      // 'early' -> daily_usage 10% 상향
      if (choice === 'early' && det.item) {
        const newUsage = Math.round(Number(det.item.daily_usage) * 1.1 * 10000) / 10000
        await onStockChange?.(det.item, undefined, { daily_usage: newUsage })
        toast(`"${det.item.name}" 소비 속도가 10% 상향됐어요`)
      }

      // 다음 감지 항목으로
      if (current < detections.length - 1) {
        setCurrent((c) => c + 1)
      } else {
        onClose()
        setCurrent(0)
      }
    } catch {
      toast('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="조기 구매 감지">
      <div className="early-purchase-body">
        <div className="early-purchase-msg">
          "{det.item.name}"을(를) 예상보다 일찍 구매하셨네요!
        </div>
        <div className="early-purchase-detail">
          평균 {det.avgInterval}일 간격 → 이번 {det.actualInterval}일 만에 구매
        </div>
        <div className="early-purchase-options">
          <button
            type="button"
            className="btn tonal block"
            disabled={saving}
            onClick={() => handleChoice('event')}
          >
            손님/이벤트가 있었어요
          </button>
          <button
            type="button"
            className="btn tonal block"
            disabled={saving}
            onClick={() => handleChoice('early')}
          >
            평소보다 많이 썼어요
          </button>
          <button
            type="button"
            className="btn tonal block"
            disabled={saving}
            onClick={() => handleChoice('normal')}
          >
            그냥 미리 샀어요
          </button>
        </div>
        {detections.length > 1 && (
          <div className="early-purchase-counter">
            {current + 1} / {detections.length}
          </div>
        )}
      </div>
    </Modal>
  )
}
