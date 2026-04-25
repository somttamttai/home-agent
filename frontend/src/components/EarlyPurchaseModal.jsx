import { useState } from 'react'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

// detections: [{ purchaseId, item, daysLeft }]
export default function EarlyPurchaseModal({ open, onClose, detections }) {
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
      if (det.purchaseId) {
        await fetch(`/api/purchases/${det.purchaseId}/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ choice }),
        })
      }
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
    <Modal open={open} onClose={onClose} title="일찍 구매하셨네요">
      <div className="early-purchase-body">
        <div className="early-purchase-msg">
          "{det.item.name}"이(가) 아직 <strong>{Math.round(det.daysLeft)}일치</strong> 남아있어요!
        </div>
        <div className="early-purchase-detail">
          이유가 뭔가요?
        </div>
        <div className="early-purchase-options">
          <button type="button" className="btn tonal block tap-btn"
            disabled={saving}
            onClick={() => handleChoice('event')}>
            🎉 손님/이벤트가 있었어요
          </button>
          <button type="button" className="btn tonal block tap-btn"
            disabled={saving}
            onClick={() => handleChoice('sale')}>
            💰 세일해서 미리 샀어요
          </button>
          <button type="button" className="btn tonal block tap-btn"
            disabled={saving}
            onClick={() => handleChoice('early')}>
            🛒 그냥 미리 샀어요
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
