import { useToast } from '../components/Toast.jsx'

// import { useEffect, useRef, useState } from 'react'
// import { BrowserMultiFormatReader } from '@zxing/browser'
// import BuyButton from '../components/BuyButton.jsx'

export default function Scan() {
  const toast = useToast()

  const onLocked = () => {
    toast('🔒 곧 업데이트 예정이에요')
  }

  // ── 실제 바코드 스캔 코드 (준비중이라 비활성화) ─────────────────
  // const videoRef = useRef(null)
  // const controlsRef = useRef(null)
  // const [scanning, setScanning] = useState(false)
  // const [result, setResult] = useState(null)
  // const [error, setError] = useState(null)
  //
  // const startScan = async () => {
  //   setError(null)
  //   setResult(null)
  //   setScanning(true)
  //   try {
  //     const reader = new BrowserMultiFormatReader()
  //     controlsRef.current = await reader.decodeFromVideoDevice(
  //       undefined,
  //       videoRef.current,
  //       (res, err, controls) => {
  //         if (res) {
  //           controls.stop()
  //           controlsRef.current = null
  //           setScanning(false)
  //           handleCode(res.getText(), res.getBarcodeFormat())
  //         }
  //       },
  //     )
  //   } catch (e) {
  //     setError(e.message || '카메라를 사용할 수 없어요')
  //     setScanning(false)
  //   }
  // }
  //
  // const stopScan = () => {
  //   if (controlsRef.current) {
  //     controlsRef.current.stop()
  //     controlsRef.current = null
  //   }
  //   setScanning(false)
  // }
  //
  // useEffect(() => () => stopScan(), [])
  //
  // const handleCode = async (code, format) => {
  //   toast(`📷 인식됨: ${code}`)
  //   try {
  //     const r = await fetch('/api/scan/barcode', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ code, format: String(format) }),
  //     })
  //     if (!r.ok) throw new Error(`HTTP ${r.status}`)
  //     setResult(await r.json())
  //   } catch (e) {
  //     setError(e.message)
  //   }
  // }
  //
  // const onManualSubmit = (e) => {
  //   e.preventDefault()
  //   const code = new FormData(e.target).get('code')?.toString().trim()
  //   if (code) handleCode(code, 'MANUAL')
  // }
  // ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="card lock-card">
        <b>📷 바코드 스캔 <span style={{ color: '#6b7280' }}>🔒</span></b>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          카메라로 상품 바코드를 비춰주세요.
        </div>
        <div className="scan-box locked" style={{ marginTop: 12 }}>
          <div className="lock-icon">🔒</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn disabled block" onClick={onLocked}>
            🔒 스캔 시작 (준비중)
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            name="code"
            placeholder="바코드 직접 입력"
            disabled
            style={{
              flex: 1, padding: 10, borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#f3f4f6', color: '#9ca3af',
            }}
          />
          <button className="btn disabled" type="button" onClick={onLocked}>
            검색
          </button>
        </div>
      </div>

      <div className="card lock-card">
        <b>🔒 상품 사진으로 인식 (준비중)</b>
        <div style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 12px' }}>
          바코드가 없는 상품은 사진으로 인식할 수 있어요.
        </div>
        <button className="btn disabled block" onClick={onLocked}>
          🔒 사진 찍기 (준비중)
        </button>
      </div>

      <div className="empty" style={{ fontSize: 12 }}>
        곧 업데이트 예정이에요.
      </div>
    </div>
  )
}
